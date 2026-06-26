from  rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Category, Product
from .serializers import CategorySerializer, ProductListSerializer, ProductDetailSerializer

class IsAdminUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_admin_user
    

class ProductListCreateView(APIView):
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get(self, request):
        
        products = Product.objects.filter(is_active=True).select_related('category')
        
        search = request.query_params.get('search')
        if search:
            products = products.filter(name__icontains=search)
            
        category_id = request.query_params.get('category')
        if category_id:
            products = products.filter(category_id=category_id)
            
        min_price = request.query_params.get('min_price')
        if min_price:
            products = products.filter(price__gte=min_price)
            
        max_price = request.query_params.get('max_price')
        if max_price:
            products = products.filter(price__lte=max_price)
            
        in_stock = request.query_params.get('in_stock')
        if in_stock == 'true':
            products = products.filter(stock__gt=0)
        
        serializer = ProductListSerializer(products, many=True)
        return Response({
            'count':products.count(),
            'products': serializer.data,
        })
        
    def post(self, request):
        
        serializer = ProductDetailSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ProductDetailView(APIView):
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get_object(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return None
    
    def get(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'error':'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)
    
    def put(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProductDetailSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'error': 'Product not found. '},
                            status=status.HTTP_404_NOT_FOUND)
        product.is_active = False 
        product.save()
        return Response({'message':f'Product "{product.name}" has been deactivated.'})
    
class CategoryListCreateView(APIView):
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    