from django.db import models
from django.contrib.auth.models import User
from datetime import date
from django.utils import timezone
from django.db.models import JSONField

# === 신규 Allergen 모델 ===
class Allergen(models.Model):
    """알러지 유발 항원 정보"""
    name = models.CharField(max_length=100, unique=True, verbose_name="알러지 항원명")

    def __str__(self):
        return self.name

# === UserProfile 모델 확장 ===
class UserProfile(models.Model):
    GENDER_CHOICES = [("M", "남성"), ("F", "여성")]
    ACTIVITY_CHOICES = [
        ("low", "활동 적음"), ("light", "약간 활동적"),
        ("active", "활동적"), ("very_active", "매우 활동적"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, blank=True)

    # --- 명시적 선호도 필드 추가 ---
    is_vegetarian = models.BooleanField(default=False, verbose_name="채식주의자")
    is_vegan = models.BooleanField(default=False, verbose_name="비건")
    allergies = models.ManyToManyField(Allergen, blank=True, related_name="users_with_allergy", verbose_name="알러지 정보")

    def __str__(self):
        return f"{self.user.username} 프로필"
    
    @property
    def age(self):
        if not self.birth_date:
            return None
        today = date.today()
        return (
            today.year
            - self.birth_date.year
            - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        )

    def get_recommended_kcal(self):
        """
        Mifflin-St Jeor 공식을 사용해서 권장 칼로리 계산.
        """
        if not (self.gender and self.height_cm and self.weight_kg and self.birth_date):
            return None

        age = self.age
        if age is None:
          return None

        # BMR 계산
        if self.gender == "M":
            bmr = 10 * self.weight_kg + 6.25 * self.height_cm - 5 * age + 5
        else:  # 여성
            bmr = 10 * self.weight_kg + 6.25 * self.height_cm - 5 * age - 161

        # 활동계수
        activity_factor = {
            "low": 1.2,
            "light": 1.375,
            "active": 1.55,
            "very_active": 1.725,
        }.get(self.activity_level or "low", 1.2)

        return int(round(bmr * activity_factor))


# === Food 모델 정의 (Allergen 필드 추가) ===
class Food(models.Model):
    """모든 음식에 대한 표준 정보를 담는 모델"""
    representative_name = models.CharField(max_length=200, db_index=True, unique=True)
    food_class = models.CharField(max_length=100, blank=True)
    energy_kcal = models.FloatField(null=True, blank=True)
    protein_g = models.FloatField(null=True, blank=True)
    fat_g = models.FloatField(null=True, blank=True)
    carbohydrate_g = models.FloatField(null=True, blank=True)
    sugars_g = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True, verbose_name="설명")
    main_ingredients = JSONField(default=list, verbose_name="주요_재료")
    taste_profile = JSONField(default=list, verbose_name="맛_특징")
    cooking_method = models.CharField(max_length=100, blank=True, verbose_name="조리_방식")
    situational_tags = JSONField(default=list, verbose_name="상황_태그")
    # --- 알러지 정보 연결 ---
    allergens = models.ManyToManyField(Allergen, blank=True, related_name="foods_containing", verbose_name="포함된 알러지 항원")

    def __str__(self):
        return self.representative_name

# === 신규 UserFoodPreference 모델 ===
class UserFoodPreference(models.Model):
    """사용자의 특정 음식에 대한 '좋아요/싫어요' 정보"""
    class Preference(models.TextChoices):
        LIKE = 'LIKE', '좋아요'
        DISLIKE = 'DISLIKE', '싫어요'

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="food_preferences")
    food = models.ForeignKey(Food, on_delete=models.CASCADE, related_name="user_preferences")
    preference = models.CharField(max_length=10, choices=Preference.choices)

    class Meta:
        unique_together = ('user_profile', 'food') # 사용자는 음식당 하나의 선호도만 가짐

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.food.representative_name}: {self.get_preference_display()}"


# === Meal, MealItem 모델 수정 (이전 제안과 동일) ===
class Meal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meals")
    created_at = models.DateTimeField(default=timezone.now)
    title = models.CharField(max_length=100, blank=True)
    
    @property
    def total_kcal(self):
        total = 0
        for item in self.items.all():
            if item.food and item.food.energy_kcal:
                total += (item.food.energy_kcal * item.weight_g) / 100.0
        return round(total, 2)

    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

class MealItem(models.Model):
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="items")
    food = models.ForeignKey(Food, on_delete=models.CASCADE, verbose_name="음식")
    weight_g = models.FloatField(verbose_name="섭취량(g)")

    def __str__(self):
        return f"{self.food.representative_name} ({self.weight_g} g)"