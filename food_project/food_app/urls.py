from django.urls import path
from . import views

urlpatterns = [
    path("predict/", views.predict_food, name="predict_food"),
    path("food-options/", views.food_options, name="food_options"),
    path("calc-nutrition/", views.calc_nutrition_view, name="calc_nutrition"),
    path("profile/", views.user_profile_view, name="user-profile"),
    path("meals/", views.meal_list_create_view, name="meal-list-create"),
    path("auth/register/", views.register_view, name="register"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("recommend-menu/", views.recommend_menu_view, name="recommend-menu"),
]
