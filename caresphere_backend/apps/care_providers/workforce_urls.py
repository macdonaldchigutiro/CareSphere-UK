from rest_framework.routers import DefaultRouter
from .workforce import ShiftBlockViewSet
router = DefaultRouter()
router.register('shift-blocks', ShiftBlockViewSet, basename='shift-block')
urlpatterns = router.urls
