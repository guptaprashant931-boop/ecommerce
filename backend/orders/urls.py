from django.urls import path
from . import views 

urlpatterns = [
    path('', views.OrderListCreateView.as_view(), name='order_list_create'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order_detail'),
    path('<int:pk>/cancel/', views.CancelOrderView.as_view(), name='order_cancel'),
    path('all/', views.AdminAllOrdersView.as_view(), name='admin_all_orders'),
    path('<int:pk>/status/', views.AdminUpdateOrderStatusView.as_view(), name='admin_update_status'),
    path('stats/', views.AdminDashboardStatusView.as_view(), name='dashboard_stats'),
]
