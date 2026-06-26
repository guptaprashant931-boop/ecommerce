from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Sum, Count
# Create your views here.


from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, OrderCreateSerializer, OrderStatusUpdateSerializer
)


class OrderListCreateView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items')
        serializer = OrderSerializer(orders, many=True)
        return Response({'orders': serializer.data, 'count': orders.count()})
    
    def post(self, request):
        
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        with transaction.atomic():
            #Create the order
            
            order = Order.objects.create(
                user=request.user,
                shipping_address=data['shipping_address'],
                payment_method=data['payment_method'],
                notes=data.get('notes', ''),
                status='pending',
            )
            
            for item_data in data['items']:
                product = item_data['product']
                quantity = item_data['quantity']
                
                product = product.__class__.objects.select_for_update().get(pk=product.pk)
                
                if product.stock < quantity:
                    raise Exception(f"Insufficient stock for {product.name}")
                
                product.stock -= quantity
                product.save(update_fields=['stock'])
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_price=product.price,
                    quantity=quantity,
                )
                
            order.calculate_total()
            
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )
        
class OrderDetailView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        
        try:
            if user.is_admin_user:
                return Order.objects.prefetch_related('items').get(pk=pk)
            return Order.objects.prefetch_related('items').get(pk=pk, user=user)
        
        except Order.DoesNotExist:
            return None
    
    def get(self, request, pk):
        order = self.get_object(pk, request.user)
        if not order:
            return Response({'error': 'Order not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    
class CancelOrderView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            order = Order.objects.prefetch_related('items__product').get(
                pk=pk, user=request.user
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'},
                            status=status.HTTP_404_NOT_FOUND)
            
        if order.status != 'pending':
            return Response(
                {'error': f'Cannot cancel order with status "{order.status}". Only pending orders can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            
            for item in order.items.all():
                if item.product:
                    item.product.stock += item.quantity
                    item.product.save(update_fields=['stock'])
                
            order.status = 'cancelled'
            order.save()
            
        return Response({'message': f'Order #{order.id} has been cancelled.'})
    
class AdminAllOrdersView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_admin_user:
            return Response({'error': 'Admin access required.'}, status=403)
        
        orders = Order.objects.all().select_related('user').prefetch_related('items')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
            
        username = request.query_params.get('user')
        if username:
            orders = orders.filter(user__username__icontains=username)
            
        serializer = OrderSerializer(orders, many=True)
        return Response({'orders': serializer.data, 'count': orders.count()})

class AdminUpdateOrderStatusView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        if not request.user.is_admin_user:
            return Response({'error': 'Admin access required.'}, status=403)
        
        try:
            order = Order.objects.get(pk=pk)
            
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)
        
        serializer = OrderStatusUpdateSerializer(order, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': f'Order #{pk} status updated to "{order.status}".',
                'order': OrderSerializer(order).data,
            })
        return Response(serializer.errors, status=400)

class AdminDashboardStatusView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_admin_user:
            return Response({'error': 'Admin access required.'}, status=403)
        
        from products.models import Product
        from users.models import CustomUser
        
        orders = Order.objects.all()
        stats = {
            'total_orders': orders.count(),
            'total_revenue': orders.filter(
                status__in=['confirmed', 'shipped', 'delivered']
            ).aggregate(rev=Sum('total_amount'))['rev'] or 0,
            'pending_orders': orders.filter(status='pending').count(),
            'confirmed_orders': orders.filter(status='confirmed').count(),
            'shipped_orders': orders.filter(status='shipped').count(),
            'delivered_orders': orders.filter(status='delivered').count(),
            'cancelled_orders': orders.filter(status='cancelled').count(),
            'total_products': Product.objects.filter(is_active=True).count(),
            'total_customers': CustomUser.objects.filter(role='customer').count(),
            'low_stock_products': Product.objects.filter(is_active=True, stock__lt=5).count(),
        }
        return Response(stats)  

    