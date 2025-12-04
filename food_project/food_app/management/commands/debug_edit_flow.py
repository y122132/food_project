from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from food_app.models import Food, Meal, MealItem
from food_app.serializers import MealSerializer
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
import pprint

class Command(BaseCommand):
    help = 'Deeply debugs the edit meal data flow by simulating an API response.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("="*50))
        self.stdout.write(self.style.SUCCESS("  '식사 수정' 데이터 흐름 정밀 디버거 시작"))
        self.stdout.write(self.style.SUCCESS("="*50))

        # --- 1. 테스트 데이터 준비 ---
        self.stdout.write(self.style.HTTP_INFO("\n[1/4] 테스트 데이터 준비 중..."))
        try:
            # 테스트용 사용자 및 음식 가져오기 (없으면 생성)
            user, _ = User.objects.get_or_create(username='testuser')
            food, _ = Food.objects.get_or_create(representative_name='김치찌개', defaults={'food_class': '찌개 및 전골'})
            
            # 테스트용 식사 및 아이템 생성
            meal = Meal.objects.create(user=user, title='점심')
            MealItem.objects.create(meal=meal, food=food, weight_g=250)

            self.stdout.write(f"  - 사용자: '{user.username}'")
            self.stdout.write(f"  - 음식: '{food.representative_name}' (food_class: '{food.food_class}')")
            self.stdout.write(f"  - 식사: '{meal.title}' (ID: {meal.id})")
            self.stdout.write(self.style.SUCCESS("  [성공] 임시 데이터가 데이터베이스에 생성되었습니다."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] 테스트 데이터 준비 중 오류 발생: {e}"))
            return

        # --- 2. Serializer를 통해 API 응답 시뮬레이션 ---
        self.stdout.write(self.style.HTTP_INFO("\n[2/4] API 응답 결과 시뮬레이션 중..."))
        try:
            # Serializer가 context의 request를 필요로 하므로, 가짜 request를 만듭니다.
            factory = APIRequestFactory()
            request = factory.get('/')
            request.user = user
            
            serializer_context = {'request': request}
            serializer = MealSerializer(instance=meal, context=serializer_context)
            api_response_data = serializer.data

            self.stdout.write(self.style.SUCCESS("  [성공] Serializer가 데이터를 JSON으로 변환했습니다. 결과:"))
            self.stdout.write("-"*20)
            pprint.pprint(api_response_data)
            self.stdout.write("-"*20)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] 데이터 직렬화(Serialization) 중 오류 발생: {e}"))
            # --- 데이터 정리 ---
            meal.delete()
            return
            
        # --- 3. API 응답 데이터 검증 ---
        self.stdout.write(self.style.HTTP_INFO("\n[3/4] API 응답 데이터의 `food_class` 필드 검증 중..."))
        try:
            first_item = api_response_data.get('items', [])[0]
            food_in_item = first_item.get('food', {})
            food_class_value = food_in_item.get('food_class')

            if food_class_value:
                self.stdout.write(f"  - 찾은 `food_class` 값: '{food_class_value}'")
                self.stdout.write(self.style.SUCCESS("  [결론] 백엔드 API는 `food_class`를 프론트엔드에 정상적으로 보내주고 있습니다."))
                self.stdout.write(self.style.WARNING("        문제는 프론트엔드가 이 데이터를 받은 후, 상태(state)를 업데이트하는 과정에서 발생하는 것으로 보입니다."))
            else:
                self.stderr.write(self.style.ERROR(f"  - `food_class` 값: {food_class_value}"))
                self.stderr.write(self.style.ERROR("  [결론] 백엔드 Serializer가 `food_class` 필드를 누락하고 있습니다! `FoodSerializer`를 확인해야 합니다."))

        except (IndexError, KeyError, AttributeError) as e:
            self.stderr.write(self.style.ERROR(f"  [실패] 응답 데이터 구조가 예상과 다릅니다. 오류: {e}"))


        # --- 4. 테스트 데이터 정리 ---
        self.stdout.write(self.style.HTTP_INFO("\n[4/4] 테스트 데이터 정리 중..."))
        try:
            meal.delete()
            # user.delete() # 사용자는 유지
            self.stdout.write(self.style.SUCCESS("  [성공] 임시 식사 데이터가 삭제되었습니다."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  [실패] 테스트 데이터 정리 중 오류 발생: {e}"))

        self.stdout.write(self.style.SUCCESS("\n" + "="*50))
        self.stdout.write(self.style.SUCCESS("  정밀 디버거 종료"))
        self.stdout.write(self.style.SUCCESS("="*50))
