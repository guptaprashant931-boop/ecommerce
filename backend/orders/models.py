from django.db import models
from django.conf import settings
from products.models import Product
# Create your models here.


class Order(models.Model):
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('online', 'Online Payment'),
        ('upi', 'UPI'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='cod')
    shipping_address = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def calculate_total(self):
        
        total = sum(item.subtotal for item in self.items.all())
        self.total_amount = total
        self.save(update_fields=['total_amount'])
        return total
    
    def __str__(self):
        return f"Order #{self.id} by {self.user.username} - {self.status}"
    
    class Meta:
        db_table = 'orders_order'
        ordering = ['-created_at']
        
class OrderItem(models.Model):
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=200)   # Snapshot at purchase time
    product_price = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot
    quantity = models.PositiveIntegerField(default=1)
    
    @property 
    def subtotal(self):
        return self.product_price * self.quantity
    
    def __str__(self):
        return f"{self.quantity} x {self.product_name} in Order #{self.order.id}"
    
    class Meta:
        db_table = 'orders_orderitem'