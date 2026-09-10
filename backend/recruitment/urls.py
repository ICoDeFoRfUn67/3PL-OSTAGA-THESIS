from django.urls import path
from .views import (
    ApplicationCreateView,
    ApplicationDetailView,
    AdminApplicationsList,
    ApplicationActionView,
    PublicDeliveryCentersView,
)

urlpatterns = [
    path('applications/', ApplicationCreateView.as_view(), name='application-create'),
    path('applications/<str:ref>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('admin/applications/', AdminApplicationsList.as_view(), name='admin-applications'),
    path('admin/applications/<str:ref>/action/', ApplicationActionView.as_view(), name='application-action'),
    path('delivery-centers/', PublicDeliveryCentersView.as_view(), name='delivery-centers-list'),
    path('recruitment/hubs/', PublicDeliveryCentersView.as_view(), name='recruitment-hubs-list'),
]
