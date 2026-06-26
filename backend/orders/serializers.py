from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'subtotal']
        read_only_fields = ['product_name', 'product_price']


class OrderItemCreateSerializer(serializers.Serializer):
    """Used when creating an order - just need product ID and quantity"""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, data):
        try:
            product = Product.objects.get(pk=data['product_id'], is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError(f"Product {data['product_id']} not found.")
        if product.stock < data['quantity']:
            raise serializers.ValidationError(
                f"Only {product.stock} units of '{product.name}' available."
            )
        data['product'] = product
        return data


class OrderSerializer(serializers.ModelSerializer):
    """Full order with all items - used for order detail and list"""
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'username', 'status', 'status_display',
            'payment_method', 'shipping_address', 'total_amount',
            'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'total_amount', 'created_at']


class OrderCreateSerializer(serializers.Serializer):
    """
    Used when placing an order.
    Accepts: shipping address + payment method + list of {product_id, quantity}
    """
    shipping_address = serializers.CharField()
    payment_method = serializers.ChoiceField(choices=['cod', 'online', 'upi'], default='cod')
    notes = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemCreateSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Order must have at least one item.")
        return items


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Used by admin to update order status"""
    class Meta:
        model = Order
        fields = ['status']

    def validate_status(self, value):
        valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
        if value not in valid:
            raise serializers.ValidationError(f"Status must be one of: {valid}")
        return value