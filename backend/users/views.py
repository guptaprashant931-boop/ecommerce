from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import UserRegistrationSerializer,UserLoginSerializer, UserProfileSerializer

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh' : str(refresh),
            'access' : str(refresh.access_token),
    }
    
class RegisterVeiw(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Registration successful!',
                'user' : UserProfileSerializer(user).data,
                'tokens' : tokens,  
            }, status = status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LoginView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Login successful!',
                'user': UserProfileSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response({'message' : 'Logged out.'})
        
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial = True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class AllUsersView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_admin_user:
            return Response({'error': 'Admin access required.'},status=status.HTTP_403_FORBIDDEN)
        users= CustomUser.objects.all().order_by('-created_at')
        serializer = UserProfileSerializer(users, many=True)
        return Response(serializer.data)
