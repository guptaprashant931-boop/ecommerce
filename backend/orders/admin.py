from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'product_price', 'quantity', 'subtotal']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'payment_method', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_method']
    search_fields = ['user__username', 'shipping_address']
    list_editable = ['status']
    inlines = [OrderItemInline]
    readonly_fields = ['total_amount', 'created_at', 'updated_at']