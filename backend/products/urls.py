from django.urls import path
from . import views 

urlpatterns = [
    path('', views.ProductListCreateView.as_view(), name='product_list_create'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product_detail'),
    path('categories/', views.CategoryListCreateView.as_view(), name='category_list_create'),
]

