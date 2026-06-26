from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
# Create your models here.

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'products_category'
        verbose_name_plural = 'Categories'
        ordering = ['name']
        
class Product(models.Model):
    
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null = True,
        blank=True,
        related_name='products'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def is_in_stock(self):
        return self.stock > 0
    
    @property 
    def image_url(self):
        if self.image:
            return self.image.url
        return ''
    
    def __str__(self):
        return f"{self.name} - ₹{self.price}"
    
    class Meta:
        db_table = 'products_product'
        ordering = ['-created_at']
