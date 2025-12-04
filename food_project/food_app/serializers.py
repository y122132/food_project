from django.contrib.auth.models import User
from rest_framework import serializers
from django.utils import timezone
from .models import UserProfile, Meal, MealItem, Food, Allergen, UserFoodPreference


class AllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class UserProfileSerializer(serializers.ModelSerializer):
    recommended_kcal = serializers.FloatField(read_only=True, source='get_recommended_kcal')
    
    # Read: Return full Allergen objects
    allergies = AllergenSerializer(many=True, read_only=True)
    
    # Write: Accept list of Allergen IDs
    allergy_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Allergen.objects.all(), 
        write_only=True,
        source='allergies', # Map this write-only field to the 'allergies' model field
        required=False
    )

    class Meta:
        model = UserProfile
        fields = [
            "gender",
            "height_cm",
            "weight_kg",
            "birth_date",
            "activity_level",
            "recommended_kcal",
            "is_vegetarian",
            "is_vegan",
            "allergies",
            "allergy_ids", # Include the new write-only field
        ]

# --- NEW: Serializer for the Food model ---
class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = [
            'id', 'representative_name', 'food_class', 
            'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g'
        ]

class UserFoodPreferenceSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.PrimaryKeyRelatedField(queryset=Food.objects.all(), source='food', write_only=True)
    
    class Meta:
        model = UserFoodPreference
        fields = ['id', 'food', 'food_id', 'preference']
        read_only_fields = ['id', 'food']

# --- REVISED: Serializer for MealItem ---
class MealItemSerializer(serializers.ModelSerializer):
    # For reading, show nested food details
    food = FoodSerializer(read_only=True)
    # For writing, accept just the food ID
    food_id = serializers.PrimaryKeyRelatedField(
        queryset=Food.objects.all(), source='food', write_only=True
    )
    # NEW: Calculate and include nutrition info on read
    nutrition = serializers.SerializerMethodField()

    class Meta:
        model = MealItem
        fields = ["id", "food", "food_id", "weight_g", "nutrition"] # Add nutrition to fields

    def get_nutrition(self, obj):
        """
        This obj is a MealItem instance.
        Calculate nutrition based on the food's base nutrition and the item's weight.
        """
        if not obj.food:
            return None

        ratio = obj.weight_g / 100.0
        
        nutrition_data = {}
        nutrition_fields = [
            'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 'sugars_g'
        ]
        
        for field_name in nutrition_fields:
            base_value = getattr(obj.food, field_name, None)
            if base_value is not None:
                nutrition_data[field_name] = round(base_value * ratio, 2)
            else:
                nutrition_data[field_name] = None
        
        # Return raw keys matching frontend expectations
        return nutrition_data

# --- REVISED: Serializer for Meal ---
class MealSerializer(serializers.ModelSerializer):
    items = MealItemSerializer(many=True)
    # total_kcal is now a read-only field from the model's property
    total_kcal = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Meal
        fields = ["id", "created_at", "title", "total_kcal", "items"]

    def _update_or_create_meal(self, user, validated_data):
        """Helper to get or create a meal for a specific title and day."""
        title = validated_data.get('title')
        today = timezone.now().date()
        
        # Use get_or_create for a cleaner operation
        meal, created = Meal.objects.get_or_create(
            user=user,
            title=title,
            created_at__date=today,
            defaults=validated_data
        )
        return meal, created

    def create(self, validated_data):
        user = self.context['request'].user
        items_data = validated_data.pop("items", [])
        
        meal, _ = self._update_or_create_meal(user, validated_data)

        # Clear old items before adding new ones
        meal.items.all().delete()
        
        # Create new MealItem instances
        for item_data in items_data:
            MealItem.objects.create(meal=meal, **item_data)
        
        meal.refresh_from_db()
        return meal

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Update Meal instance fields
        instance.title = validated_data.get('title', instance.title)
        instance.save()

        # Clear and create new items
        instance.items.all().delete()
        for item_data in items_data:
            MealItem.objects.create(meal=instance, **item_data)
        
        instance.refresh_from_db()
        return instance
