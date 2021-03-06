import React, { useState, useContext } from "react";
import FixedHeightLayout from "../../src/components/layouts/FixedHeightLayout";
import Cookies from "next-cookies";
import axios from "axios";
import tokenConfig from "../../public/config/tokenConfig";
import { getMessageFromServer } from "../../public/lib/messagingOperations";
import UserContext from "../../src/components/context/UserContext";
import PageNotFound from "../../src/components/general/PageNotFound";
import { sendToLogin } from "../../public/lib/apiOperations";
import MessagingLayout from "../../src/components/communication/chat/MessagingLayout";

export default function Chat({
  chatParticipants,
  title,
  token,
  chatUUID,
  messages,
  nextLink,
  hasMore,
  rolesOptions,
  chat_id
}) {
  const { chatSocket, user } = useContext(UserContext);
  const [participants, setParticipants] = React.useState(chatParticipants);
  const [socketClosed, setSocketClosed] = useState(false);
  const [state, setState] = React.useState({
    nextPage: 2,
    messages: [...messages],
    nextLink: nextLink,
    hasMore: hasMore
  });

  const handleWindowClose = e => {
    if (state.messages.filter(m => m.unconfirmed).length > 0) {
      e.preventDefault();
      return (e.returnValue = "Changes you made might not be saved.");
    }
  };

  React.useEffect(() => {
    window.addEventListener("beforeunload", handleWindowClose);

    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
    };
  });

  const chatting_partner = participants.filter(p => p.id !== user.id)[0];
  const isPrivateChat = !title || title.length === 0;

  if (chatSocket) {
    chatSocket.onmessage = async rawData => {
      const data = JSON.parse(rawData.data);
      if (data.chat_uuid === chatUUID) {
        const message = await getMessageFromServer(data.message_id, token);
        setState({
          ...state,
          messages: [
            ...state.messages.filter(m => !(m.content === message.content && m.unconfirmed)),
            message
          ]
        });
      }
    };
  }

  const loadMoreMessages = async () => {
    try {
      const newMessagesObject = await getChatMessagesByUUID(
        chatUUID,
        token,
        state.nextPage,
        state.nextLink
      );
      const newMessages = newMessagesObject.messages;
      const sortedMessages = newMessages.sort((a, b) => a.id - b.id);
      setState({
        ...state,
        nextPage: state.nextPage + 1,
        nextLink: newMessagesObject.nextLink,
        hasMore: newMessagesObject.hasMore,
        messages: [...sortedMessages, ...state.messages]
      });

      return [...sortedMessages];
    } catch (e) {
      console.log("error");
      console.log(e);
      setState({
        ...state,
        hasMore: false
      });
      return [];
    }
  };

  const sendMessage = async message => {
    if (message.length > 0) {
      chatSocket.send(JSON.stringify({ message: message, chat_uuid: chatUUID }));
      setState({
        ...state,
        messages: [
          ...state.messages,
          {
            content: message,
            sender: user,
            unconfirmed: true,
            sent_at: new Date()
          }
        ]
      });
    }
  };

  return (
    <FixedHeightLayout
      title={
        isPrivateChat
          ? "Message " + chatting_partner.first_name + " " + chatting_partner.last_name
          : title
      }
    >
      {chatting_partner ? (
        <MessagingLayout
          chatting_partner={chatting_partner}
          messages={state.messages}
          isPrivateChat={isPrivateChat}
          title={title}
          sendMessage={sendMessage}
          socketClosed={socketClosed}
          loadMoreMessages={loadMoreMessages}
          hasMore={state.hasMore}
          participants={participants}
          rolesOptions={rolesOptions}
          token={token}
          chat_uuid={chatUUID}
          chat_id={chat_id}
          setParticipants={setParticipants}
        />
      ) : (
        <PageNotFound itemName="Chat" />
      )}
    </FixedHeightLayout>
  );
}

Chat.getInitialProps = async ctx => {
  const { token } = Cookies(ctx);
  if (ctx.req && !token) {
    const message = "You have to log in to see your chats.";
    return sendToLogin(ctx, message);
  }
  const [chat, messages_object, rolesOptions] = await Promise.all([
    getChat(ctx.query.chatUUID, token),
    getChatMessagesByUUID(ctx.query.chatUUID, token, 1),
    getRolesOptions()
  ]);
  return {
    token: token,
    chat_uuid: chat.chat_uuid,
    chatParticipants: parseParticipantsWithRole(chat.participants, rolesOptions),
    title: chat.title,
    messages: messages_object.messages,
    nextLink: messages_object.nextLink,
    hasMore: messages_object.hasMore,
    chatUUID: ctx.query.chatUUID,
    rolesOptions: rolesOptions,
    chat_id: chat.id
  };
};

const parseParticipantsWithRole = (participants, rolesOptions) => {
  return participants.map(p => ({
    ...p,
    role: rolesOptions.find(o => o.name === p.role)
  }));
};

async function getChat(chat_uuid, token) {
  const resp = await axios.get(
    process.env.API_URL + "/api/chat/" + chat_uuid + "/",
    tokenConfig(token)
  );
  return {
    participants: parseParticipants(resp.data.participants, resp.data.user),
    title: resp.data.name,
    id: resp.data.id
  };
}

const parseParticipants = (participants, user) => {
  return participants.map(p => ({
    ...p.user_profile,
    role: p.role,
    created_at: p.created_at,
    is_self: user.id === p.user_profile.id,
    participant_id: p.participant_id
  }));
};

async function getChatMessagesByUUID(chat_uuid, token, page, link) {
  try {
    const url = link
      ? link
      : process.env.API_URL + "/api/messages/?chat_uuid=" + chat_uuid + "&page=" + page;
    const resp = await axios.get(url, tokenConfig(token));
    return {
      messages: resp.data.results,
      hasMore: !!resp.data.next && resp.data.next !== link,
      nextLink: resp.data.next
    };
  } catch (err) {
    if (err.response && err.response.data) console.log("Error: " + err.response.data.detail);
    console.log("error!");
    console.log(err);
    return null;
  }
}

const getRolesOptions = async () => {
  try {
    const resp = await axios.get(process.env.API_URL + "/roles/");
    if (resp.data.results.length === 0) return null;
    else {
      return resp.data.results;
    }
  } catch (err) {
    console.log(err);
    if (err.response && err.response.data) console.log("Error: " + err.response.data.detail);
    return null;
  }
};
