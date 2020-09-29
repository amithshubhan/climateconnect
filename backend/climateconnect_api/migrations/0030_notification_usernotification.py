# Generated by Django 2.2.13 on 2020-09-29 16:38

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organization', '0056_merge_20200827_0530'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat_messages', '0002_auto_20200922_1521'),
        ('climateconnect_api', '0029_faqquestion_faqsection'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.IntegerField(choices=[(0, 'broadcast'), (1, 'private_message'), (2, 'project_comment'), (3, 'reply_to_project_comment'), (4, 'project_follower'), (5, 'project_update_post'), (6, 'post_comment'), (7, 'reply_to_post_comment')], default=0, help_text='type of notification', verbose_name='Notification type')),
                ('text', models.CharField(blank=True, help_text='Text to be displayed in Notification', max_length=280, null=True, verbose_name='Text')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Time when participants started a messaging', verbose_name='Created at')),
                ('chat', models.ForeignKey(blank=True, help_text="Points to chat for notifications of type 'private_message'", null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_chat', to='chat_messages.MessageParticipants', verbose_name='Chat')),
                ('chat_message_sender', models.ForeignKey(blank=True, help_text="Sender of a chat message on notifications of type 'private_message", null=True, on_delete=django.db.models.deletion.PROTECT, related_name='notification_chat_message_sender', to=settings.AUTH_USER_MODEL, verbose_name='Chat message sender')),
                ('post_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_post_comment', to='organization.PostComment', verbose_name='Post comment')),
                ('project_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_project_comment', to='organization.ProjectComment', verbose_name='Project comment')),
                ('project_follower', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_project_follower', to='organization.ProjectFollower', verbose_name='Project Follower')),
                ('project_update_post', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notification_project_update_post', to='organization.Post', verbose_name='Project Post')),
            ],
        ),
        migrations.CreateModel(
            name='UserNotification',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(blank=True, help_text='Time when the user has read the notification', null=True, verbose_name='Read at')),
                ('notification', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_notification_notification', to='climateconnect_api.Notification', verbose_name='Notification')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_notification_user', to=settings.AUTH_USER_MODEL, verbose_name='User')),
            ],
        ),
    ]
