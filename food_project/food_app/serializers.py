from django.contrib.auth.models import User
from rest_framework import serializers
from django.utils import timezone
from .models import UserProfile, Meal, MealItem


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True)

#     class Meta:
#         model = User
#         fields = ("username", "email", "password")

#     def create(self, validated_data):
#         user = User.objects.create_user(
#             username=validated_data["username"],
#             email=validated_data.get("email", ""),
#             password=validated_data["password"],
#         )
#         # 프로필 기본 생성
#         UserProfile.objects.create(user=user)
#         return user

class UserProfileSerializer(serializers.ModelSerializer):
    recommended_kcal = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "gender",
            "height_cm",
            "weight_kg",
            "birth_date",
            "activity_level",
            "recommended_kcal",
        ]

    def get_recommended_kcal(self, obj):
        return obj.get_recommended_kcal()
    

class MealItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealItem
        fields = ["id", "pred_class", "food_name", "weight_g", "nutrition"]

class MealSerializer(serializers.ModelSerializer):
    items = MealItemSerializer(many=True)
    
    class Meta:
        model = Meal
        fields = ["id", "created_at", "title", "total_kcal", "items"]

    def create(self, validated_data):
        user = self.context['request'].user
        items_data = validated_data.pop("items", [])
        title = validated_data.get('title')
        today = timezone.now().date()

        # Find existing meal for this title and day
        existing_meal = Meal.objects.filter(
            user=user,
            title=title,
            created_at__date=today
        ).first()

        if existing_meal:
            meal = existing_meal
            # Clear all existing items for this meal before adding new ones
            meal.items.all().delete()
        else:
            # If no meal exists, create a new one
            meal = Meal.objects.create(user=user, **validated_data)

        # Create the new meal items for the meal
        for item_data in items_data:
            MealItem.objects.create(meal=meal, **item_data)

        # Recalculate total_kcal
        total_kcal = 0
        for item in meal.items.all():
            kcal = item.nutrition.get('에너지(kcal)')
            if kcal:
                total_kcal += float(kcal)
        
        meal.total_kcal = total_kcal
        meal.save()
        
        return meal
