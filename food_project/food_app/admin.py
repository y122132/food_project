# food_app/admin.py
from django.contrib import admin
from .models import UserProfile, Meal, MealItem, Food, Allergen, UserFoodPreference


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "gender", "height_cm", "weight_kg", "birth_date", "activity_level")
    list_filter = ("gender", "activity_level")
    search_fields = ("user__username",)
    filter_horizontal = ('allergies',) # For easier selection of multiple allergens


class MealItemInline(admin.TabularInline):
    model = MealItem
    extra = 0
    autocomplete_fields = ['food'] # Makes finding a food item easier


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "created_at", "total_kcal")
    list_filter = ("created_at",)
    search_fields = ("user__username", "title")
    inlines = [MealItemInline]


@admin.register(MealItem)
class MealItemAdmin(admin.ModelAdmin):
    list_display = ("meal", "food", "weight_g")
    search_fields = ("food__representative_name", "meal__user__username")
    autocomplete_fields = ['meal', 'food']


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ('representative_name', 'food_class', 'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g')
    search_fields = ('representative_name',)
    list_filter = ('food_class',)
    filter_horizontal = ('allergens',)


@admin.register(Allergen)
class AllergenAdmin(admin.ModelAdmin):
    search_fields = ('name',)


@admin.register(UserFoodPreference)
class UserFoodPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user_profile', 'food', 'preference')
    list_filter = ('preference',)
    search_fields = ('user_profile__user__username', 'food__representative_name')
    autocomplete_fields = ['user_profile', 'food']
