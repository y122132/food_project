from django.contrib.auth.models import User
from rest_framework import serializers
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
        items_data = validated_data.pop("items", [])
        meal = Meal.objects.create(**validated_data)
        for item_data in items_data:
            MealItem.objects.create(meal=meal, **item_data)
        return meal

