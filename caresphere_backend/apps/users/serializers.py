from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "phone_number",
            "date_of_birth",
            "is_verified",
            "date_joined",
        )

        read_only_fields = (
            "id",
            "email",
            "user_type",
            "is_verified",
            "date_joined",
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    user_type = serializers.ChoiceField(
        choices=User.USER_TYPES,
        default="family",
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "password",
            "user_type",
        )

    def validate_email(self, value):
        value = value.lower().strip()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email address already exists."
            )

        return value

    def create(self, validated_data):
        email = validated_data["email"].lower().strip()

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=validated_data["first_name"].strip(),
            last_name=validated_data["last_name"].strip(),
            password=validated_data["password"],
            user_type=validated_data.get("user_type", "family"),
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"].lower().strip()
        password = data["password"]

        user = authenticate(
            username=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError("Invalid email address or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")

        return {
            "user": user,
        }
