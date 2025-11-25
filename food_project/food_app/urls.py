from django.urls import path
from . import views

urlpatterns = [
    path("predict/", views.predict_food, name="predict_food"),
    path("food-options/", views.food_options, name="food_options"),
    path("calc-nutrition/", views.calc_nutrition_view, name="calc_nutrition"),
]
