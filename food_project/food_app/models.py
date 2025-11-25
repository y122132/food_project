from django.db import models
from django.contrib.auth.models import User
from datetime import date
from django.utils import timezone
from django.db.models import JSONField  # Django 3.1+ 에서 사용 가능

#UserProfile
class UserProfile(models.Model):
    GENDER_CHOICES = [
        ("M", "남성"),
        ("F", "여성"),
    ]

    ACTIVITY_CHOICES = [
        ("low", "활동 적음"),
        ("light", "약간 활동적"),
        ("active", "활동적"),
        ("very_active", "매우 활동적"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    height_cm = models.FloatField(null=True, blank=True)   # 키
    weight_kg = models.FloatField(null=True, blank=True)   # 몸무게
    birth_date = models.DateField(null=True, blank=True)   # 생년월일
    activity_level = models.CharField(
        max_length=20, choices=ACTIVITY_CHOICES, blank=True
    )

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

# 식사 저장
class Meal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meals")
    created_at = models.DateTimeField(default=timezone.now)
    title = models.CharField(max_length=100, blank=True)  # 예: "점심", "저녁" 등
    total_kcal = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

class MealItem(models.Model):
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="items")
    pred_class = models.CharField(max_length=100)   # 대표식품명
    food_name = models.CharField(max_length=200)    # 식품명
    weight_g = models.FloatField()
    nutrition = JSONField()  # {'에너지(kcal)': ..., '탄수화물(g)': ..., ...}

    def __str__(self):
        return f"{self.food_name} ({self.weight_g} g)"
