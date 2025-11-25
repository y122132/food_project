# food_app/admin.py
from django.contrib import admin
from .models import UserProfile, Meal, MealItem


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "gender", "height_cm", "weight_kg", "birth_date", "activity_level")
    list_filter = ("gender", "activity_level")
    search_fields = ("user__username", "user__email")


class MealItemInline(admin.TabularInline):
    model = MealItem
    extra = 0


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "created_at", "total_kcal")
    list_filter = ("created_at",)
    search_fields = ("user__username", "title")
    inlines = [MealItemInline]


@admin.register(MealItem)
class MealItemAdmin(admin.ModelAdmin):
    list_display = ("meal", "food_name", "weight_g")
    search_fields = ("food_name", "meal__user__username")
