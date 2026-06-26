from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser

class UserRegistrationSerializer(serializers.ModelSerializer):
    
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True) # Confirm Password
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'password2', 'role', 'phone', 'address']
        
        extra_kwargs = {
            'email' : {'required' : True},
            'role' : {'default': 'customer'},
        }
        
        def validate(self, data):
            if data['password'] != data['password2']:
                raise serializers.ValidationError({"password": "Passwords do not match"})
            return data
        
        def create(self, validated_data):
            validated_data.pop('password2')
            password = validated_data.pop('password')
            user = CustomUser(**validated_data)
            user.set_password(password)
            user.save()
            return user
        
class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data['user'] = user 
        return data
    
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'phone', 'address', 'created_at']
        read_only_fields = ['id', 'role', 'created_at']
        