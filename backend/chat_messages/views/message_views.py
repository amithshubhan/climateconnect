from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound

from uuid import uuid4

from django.contrib.auth.models import User
from chat_messages.models import MessageParticipants, Message
from chat_messages.serializers.message import MessageSerializer
from chat_messages.pagination import ChatMessagePagination
from climateconnect_api.models import UserProfile


class ConnectMessageParticipantsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if 'profile_url_slug' not in request.data:
            return Response({
                'message': 'Required parameter is missing'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_profile = UserProfile.objects.get(
                url_slug=str(request.data['profile_url_slug'])
            )
        except User.DoesNotExist:
            return Response({
                'message': 'Participant not found'
            }, status=status.HTTP_404_NOT_FOUND)

        participant_user = user_profile.user
        if participant_user:
            participants = [user, participant_user]

            message_participants = MessageParticipants.objects.create(
                chat_uuid=str(uuid4())
            )
            for user in participants:
                message_participants.participants.add(user)

            message_participants.save()
            return Response({
                'chat_id': message_participants.chat_uuid,
                'profile_url': user_profile.url_slug
            }, status=status.HTTP_201_CREATED)


class ListParticipantsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, url_slug):
        try:
            profile = UserProfile.objects.get(url_slug=str(url_slug))
        except UserProfile.DoesNotExist:
            return Response({
                'message': "Profile not found."
            }, status=status.HTTP_404_NOT_FOUND)

        participants = MessageParticipants.objects.filter(
            participants=profile.user
        )
        # TODO: Add serializer to return information.

        return Response(None, status=status.HTTP_200_OK)


class GetChatMessages(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = ChatMessagePagination

    def get_queryset(self):
        user = self.request.user
        if 'chat_uuid' not in self.request.query_params:
            return Response({
                'message': 'Required parameter missing'
            }, status=status.HTTP_400_BAD_REQUEST)

        chat_uuid = self.request.query_params.get('chat_uuid')
        participant_user_id = self.request.query_params.get('user_id')
        try:
            participant_user = User.objects.get(id=int(participant_user_id))
        except User.DoesNotExist:
            raise NotFound('participants not found')

        if participant_user:
            participants = [user, participant_user]
            try:
                message_participant = MessageParticipants.objects.filter(
                    chat_uuid=chat_uuid, participants__in=participants
                )
            except MessageParticipants.DoesNotExist:
                raise NotFound('There are no participants.')

            if message_participant:
                messages = Message.objects.filter(
                    message_participant=message_participant
                )
                return messages
