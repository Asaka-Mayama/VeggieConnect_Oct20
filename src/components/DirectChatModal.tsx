import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Info,
  ArrowLeft,
  Minus,
  X,
  Send,
  ThumbsUp,
  Image as ImageIcon,
  PlusCircle,
  Smile,
  Mic,
  Check,
  CheckCheck,
  Sprout,
  Truck,
  ShoppingBag,
  Store,
  User,
  MoreVertical,
  BellOff
} from 'lucide-react';
import { DirectMessage, UserRole, UserProfile } from '../types';

export interface ChatContact {
  id: string;
  name: string;
  role: UserRole;
  farmName?: string;
  avatar?: string;
  verified?: boolean;
  produceContext?: string;
  orderId?: string;
  lastActive?: string;
  isOnline?: boolean;
}

interface DirectChatModalProps {
  userRole: UserRole;
  currentUser: UserProfile | null;
  activePartner: ChatContact | null;
  messages: DirectMessage[];
  onSendMessage: (text: string, partner: ChatContact) => void;
  onSelectPartner: (partner: ChatContact) => void;
  availableContacts: ChatContact[];
  isChatBoxOpen?: boolean;
  setIsChatBoxOpen?: (open: boolean) => void;
  onCloseChatBox?: () => void;
}

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  userRole,
  currentUser,
  activePartner,
  messages,
  onSendMessage,
  onSelectPartner,
  availableContacts,
  isChatBoxOpen = false,
  setIsChatBoxOpen,
  onCloseChatBox,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'farmer' | 'buyer'>('all');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = currentUser?.id || 'me';

  // Strictly sanitize available contacts so current user is excluded from initiating self chat
  // and include any contact that has messages with current user or is active partner
  const sanitizedContacts = useMemo(() => {
    const map = new Map<string, ChatContact>();
    availableContacts.forEach((c) => map.set(c.id, c));

    // Include the active chat partner
    if (activePartner && activePartner.id !== currentUserId) {
      map.set(activePartner.id, activePartner);
    }

    // Include any contact who has messages with current user
    messages.forEach((m) => {
      const isOtherRecipient = m.senderId === currentUserId;
      const otherId = isOtherRecipient ? m.recipientId : m.senderId;
      const otherName = isOtherRecipient ? m.recipientName : m.senderName;
      const otherRole = isOtherRecipient ? m.recipientRole : m.senderRole;
      if (otherId && otherId !== currentUserId && !map.has(otherId)) {
        map.set(otherId, {
          id: otherId,
          name: otherName || 'Contact',
          role: otherRole || 'buyer',
          isOnline: true,
          lastActive: 'Active recently',
        });
      }
    });

    return Array.from(map.values()).filter((contact) => {
      if (contact.id === currentUserId || contact.id === 'me') return false;
      if (currentUser?.id && contact.id === currentUser.id) return false;
      if (currentUser?.name && contact.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return false;
      return true;
    });
  }, [availableContacts, currentUserId, currentUser, activePartner, messages]);

  // Check if current active partner is the user themselves
  const isActivePartnerSelf = Boolean(
    activePartner &&
      currentUser &&
      (activePartner.id === currentUserId ||
        activePartner.id === 'me' ||
        activePartner.id === currentUser.id ||
        (currentUser.name && activePartner.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
  );

  // Helper to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatBoxOpen) {
      scrollToBottom();
    }
  }, [messages, isChatBoxOpen, activePartner?.id]);

  // Active contacts who have an existing message exchange with the current user
  const contactsWithMessages = useMemo(() => {
    if (userRole !== 'admin') {
      // For farmer/buyer, the active online carousel can show the Seller (Admin)
      return sanitizedContacts.filter((c) => c.role === 'admin' || c.id === 'admin-main');
    }
    return sanitizedContacts.filter((contact) => {
      const hasMsgs = messages.some((m) =>
        (m.senderId === currentUserId && m.recipientId === contact.id) ||
        (m.senderId === contact.id && m.recipientId === currentUserId) ||
        (m.farmerId === contact.id && m.buyerId === currentUserId) ||
        (m.buyerId === contact.id && m.farmerId === currentUserId)
      );
      return hasMsgs;
    });
  }, [sanitizedContacts, messages, currentUserId, userRole]);

  // Derive conversation summary for contacts: only include users who have exchanged messages (or if user searched)
  const conversationSummaries = useMemo(() => {
    return sanitizedContacts
      .map((contact) => {
        // Find all messages with this contact
        const contactMsgs = messages.filter((m) => {
          const isPair =
            (m.senderId === currentUserId && m.recipientId === contact.id) ||
            (m.senderId === contact.id && m.recipientId === currentUserId);
          const isLegacy =
            (m.farmerId === contact.id && m.buyerId === currentUserId) ||
            (m.buyerId === contact.id && m.farmerId === currentUserId);
          return isPair || isLegacy;
        });

        const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;
        const unreadCount = contactMsgs.filter(
          (m) => m.recipientId === currentUserId && !m.isRead
        ).length;

        return {
          contact,
          lastMessage: lastMsg,
          unreadCount,
          messageCount: contactMsgs.length,
        };
      })
      .filter(({ contact, messageCount }) => {
        // For non-admin roles (farmer & buyer), ALWAYS display the Seller (Admin) in the list
        if (userRole !== 'admin' && (contact.role === 'admin' || contact.id === 'admin-main')) {
          return true;
        }
        // If user typed a search query, show registered users matching the query to allow initiating a new chat
        if (searchQuery.trim()) return true;
        // For admin, only show users with existing messages unless searching
        return messageCount > 0;
      });
  }, [sanitizedContacts, messages, currentUserId, searchQuery, userRole]);

  // Filtered list based on search and role tabs
  const filteredConversations = useMemo(() => {
    return conversationSummaries.filter(({ contact, lastMessage }) => {
      if (filterRole !== 'all' && contact.role !== filterRole) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = contact.name.toLowerCase().includes(q);
      const matchFarm = contact.farmName?.toLowerCase().includes(q) || false;
      const matchText = lastMessage?.text.toLowerCase().includes(q) || false;
      return matchName || matchFarm || matchText;
    });
  }, [conversationSummaries, filterRole, searchQuery]);

  // Thread messages for the currently open chat box
  const threadMessages = useMemo(() => {
    if (!activePartner) return [];
    return messages.filter((msg) => {
      const isDirectPair =
        (msg.senderId === currentUserId && msg.recipientId === activePartner.id) ||
        (msg.senderId === activePartner.id && msg.recipientId === currentUserId);
      const isLegacyFarmerBuyer =
        (msg.farmerId === activePartner.id && msg.buyerId === currentUserId) ||
        (msg.buyerId === activePartner.id && msg.farmerId === currentUserId);
      return isDirectPair || isLegacyFarmerBuyer;
    });
  }, [messages, currentUserId, activePartner]);

  // Handle message submission
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activePartner) return;
    onSendMessage(inputText.trim(), activePartner);
    setInputText('');
  };

  // Handle Facebook Thumbs-up
  const handleSendLike = () => {
    if (!activePartner) return;
    onSendMessage('👍', activePartner);
  };

  // Generate a distinct avatar color for contacts without custom images
  const getAvatarBg = (id: string) => {
    const colors = [
      'bg-emerald-600',
      'bg-teal-600',
      'bg-blue-600',
      'bg-indigo-600',
      'bg-purple-600',
      'bg-amber-600',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  // Render the Facebook Messenger Chat Box Window
  const renderChatBox = () => {
    if (!activePartner) return null;

    return (
      <div className="flex flex-col h-full bg-[#f4faf5] text-neutral-900 select-none">
        {/* Messenger Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-emerald-100 shadow-xs z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Back button to return to conversation list */}
            <button
              id="btn-messenger-back"
              onClick={() => {
                if (setIsChatBoxOpen) setIsChatBoxOpen(false);
                if (onCloseChatBox) onCloseChatBox();
              }}
              className="p-1.5 -ml-1 text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
              title="Back to Chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Profile Avatar with Online / Offline Status Dot */}
            <div className="relative flex-shrink-0">
              {activePartner.avatar ? (
                <img
                  src={activePartner.avatar}
                  alt={activePartner.name}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-200"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full ${getAvatarBg(
                    activePartner.id
                  )} text-white font-bold flex items-center justify-center text-sm shadow-inner`}
                >
                  {activePartner.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online / Offline Dot */}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  activePartner.isOnline !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
            </div>

            {/* Contact Name & Status */}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-emerald-950 truncate leading-tight flex items-center gap-1.5">
                <span>{activePartner.name}</span>
                {activePartner.verified && (
                  <span className="text-emerald-600 text-xs font-bold" title="Verified">
                    ✓
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 leading-tight truncate font-medium">
                {activePartner.isOnline !== false ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700 font-semibold">Active now</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    <span className="text-neutral-500">Offline</span>
                  </>
                )}
                {activePartner.farmName && (
                  <>
                    <span>·</span>
                    <span className="truncate text-emerald-800 font-semibold">
                      {activePartner.farmName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Icons (Close) */}
          <div className="flex items-center gap-1 text-emerald-700">
            <button
              id="btn-messenger-close"
              onClick={() => {
                if (setIsChatBoxOpen) setIsChatBoxOpen(false);
                if (onCloseChatBox) onCloseChatBox();
              }}
              className="p-2 hover:bg-emerald-50 rounded-full text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer"
              title="Close chat box"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Online/Offline Presence Notification */}
        {activePartner.isOnline !== false ? (
          <div className="px-3.5 py-1.5 bg-emerald-50/90 border-b border-emerald-200/70 flex items-center justify-between text-xs text-emerald-900 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold">{activePartner.name} is currently online</span>
            </div>
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              Online
            </span>
          </div>
        ) : (
          <div className="px-3.5 py-1.5 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-700 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full h-2 w-2 bg-neutral-400"></span>
              <span className="text-[11px] font-semibold">{activePartner.name} is currently offline</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider bg-neutral-200 px-2 py-0.5 rounded-full border border-neutral-300">
              Offline
            </span>
          </div>
        )}

        {/* Produce / Order Context Banner (if inquiring from a product or order) */}
        {(activePartner.produceContext || activePartner.orderId) && (
          <div className="px-3.5 py-1.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
            <span className="truncate">
              Inquiry Context:{' '}
              <strong className="text-emerald-950">
                {activePartner.produceContext || `Order #${activePartner.orderId}`}
              </strong>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
              Direct Agri
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f4faf5]">
          {/* Header Profile Greeting inside conversation */}
          <div className="text-center py-5 space-y-2">
            <div className="relative inline-block">
              {activePartner.avatar ? (
                <img
                  src={activePartner.avatar}
                  alt={activePartner.name}
                  className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-emerald-200"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-full ${getAvatarBg(
                    activePartner.id
                  )} text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md`}
                >
                  {activePartner.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Profile Avatar inside thread */}
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                  activePartner.isOnline !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
            </div>
            <div>
              <h3 className="font-bold text-sm text-emerald-950">{activePartner.name}</h3>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {activePartner.isOnline !== false ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    Offline ({activePartner.lastActive || 'Recently'})
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                {activePartner.role === 'farmer'
                  ? activePartner.farmName || 'Local Farmer'
                  : 'Direct Buyer'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Connected on Direct Chat
              </p>
            </div>
          </div>

          {/* Render Thread Messages */}
          {threadMessages.length === 0 ? (
            <div className="text-center py-4 px-6 text-neutral-500 space-y-2">
              <p className="text-xs">Wave to say hello and start your conversation! 👋</p>
            </div>
          ) : (
            threadMessages.map((msg, index) => {
              const isMe =
                msg.senderId === currentUserId ||
                (msg.senderRole === userRole && !msg.senderId);

              // Check if thumbs up message
              const isThumbsUp = msg.text === '👍';

              return (
                <div
                  key={msg.id || index}
                  className={`flex items-end gap-1.5 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Incoming Contact Avatar */}
                  {!isMe && (
                    <div className="flex-shrink-0 mb-0.5">
                      {activePartner.avatar ? (
                        <img
                          src={activePartner.avatar}
                          alt={activePartner.name}
                          className="w-7 h-7 rounded-full object-cover border border-emerald-200"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full ${getAvatarBg(
                            activePartner.id
                          )} text-white font-bold text-[10px] flex items-center justify-center`}
                        >
                          {activePartner.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    {isThumbsUp ? (
                      <div className="text-4xl py-1 px-1 select-none animate-bounce">
                        👍
                      </div>
                    ) : (
                      <div
                        className={`px-3.5 py-2 text-xs leading-relaxed shadow-xs break-words ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-2xl rounded-br-xs'
                            : 'bg-white text-neutral-900 border border-emerald-100 rounded-2xl rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {/* Timestamp & Seen Receipt */}
                    <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-0.5 px-1">
                      <span>{msg.timestamp || 'Just now'}</span>
                      {isMe && (
                        <span title="Delivered">
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Messenger Footer Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-2.5 bg-white border-t border-emerald-100 flex items-center gap-2"
        >
          {/* Action icon buttons */}
          <button
            type="button"
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer flex-shrink-0"
            title="Add media"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer flex-shrink-0"
            title="Attach harvest photo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Messenger Input Pill */}
          <div className="flex-1 relative flex items-center">
            <input
              id="input-messenger-text"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Aa"
              className="w-full bg-emerald-50/50 border border-emerald-200 text-neutral-900 placeholder-neutral-400 text-xs px-3.5 py-2 rounded-full focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
            <button
              type="button"
              className="absolute right-2 text-emerald-600 hover:text-emerald-800 p-1 transition-colors cursor-pointer"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbs Up or Send button */}
          {inputText.trim() ? (
            <button
              id="btn-messenger-send"
              type="submit"
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors flex-shrink-0 cursor-pointer shadow-xs"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="btn-messenger-thumbs-up"
              type="button"
              onClick={handleSendLike}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex-shrink-0 cursor-pointer text-xl"
              title="Send Thumbs Up"
            >
              <ThumbsUp className="w-5 h-5 fill-emerald-600" />
            </button>
          )}
        </form>
      </div>
    );
  };

  // If chat box is requested to be open and activePartner is chosen, render the Message Box!
  if (isChatBoxOpen && activePartner) {
    if (isActivePartnerSelf) {
      return (
        <div className="flex flex-col h-full bg-[#f4faf5] text-neutral-900 p-6 items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl text-amber-700">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-emerald-950 font-display">Direct Chat with Yourself is Disabled</h3>
          <p className="text-xs text-neutral-600 max-w-xs leading-relaxed">
            You cannot initiate a direct chat with your own profile. You can only start conversations with other registered community members.
          </p>
          <button
            onClick={() => {
              if (onCloseChatBox) onCloseChatBox();
              else if (setIsChatBoxOpen) setIsChatBoxOpen(false);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Back to Conversations
          </button>
        </div>
      );
    }
    return renderChatBox();
  }

  // Otherwise, render the Facebook Messenger Conversation List (matching image.png!)
  return (
    <div className="flex flex-col h-full bg-[#f4faf5] text-neutral-900 select-none">
      {/* Messenger Top Header: "Chats" */}
      <div className="p-3 bg-white space-y-3 border-b border-emerald-100 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-emerald-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h1 className="text-xl font-black tracking-tight text-emerald-950 font-display">
              Chats
            </h1>
          </div>

          <div className="flex items-center gap-1 text-emerald-800">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Search Messenger Pill */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3 pointer-events-none" />
          <input
            id="input-messenger-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Messenger"
            className="w-full bg-emerald-50/50 text-neutral-900 placeholder-neutral-400 text-xs pl-9 pr-4 py-2 rounded-full border border-emerald-200 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Filter Tabs - ONLY shown for Admin */}
        {userRole === 'admin' ? (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'farmer', label: '👨‍🌾 Farmers' },
                { id: 'buyer', label: '🛒 Buyers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterRole === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          /* For Buyer & Farmer: Show Seller Desk Connection Banner */
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-700" />
              <div>
                <p className="text-xs font-bold text-emerald-950">VeggieConnect Seller</p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  {userRole === 'farmer'
                    ? 'Direct communication for harvest lots & farm-gate payouts'
                    : 'Direct communication for orders, quality & delivery'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        )}

        {/* Active Online Contacts Carousel: only show contacts who have exchanged messages or Seller */}
        {contactsWithMessages.length > 0 && (
          <div className="pt-2 border-t border-emerald-100">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {contactsWithMessages.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    onSelectPartner(contact);
                    if (setIsChatBoxOpen) setIsChatBoxOpen(true);
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0 w-14 group cursor-pointer"
                  title={`Chat with ${contact.name}`}
                >
                  <div className="relative">
                    {contact.avatar ? (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full ${getAvatarBg(
                          contact.id
                        )} text-white font-bold text-sm flex items-center justify-center shadow group-hover:scale-105 transition-transform`}
                      >
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online / Offline Dot */}
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        contact.isOnline !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-600 group-hover:text-emerald-950 font-medium truncate w-full text-center leading-tight">
                    {contact.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messenger Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-emerald-100/80">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 space-y-3 my-auto">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-xl text-emerald-600">
              💬
            </div>
            <p className="text-sm font-bold text-emerald-950">
              {searchQuery.trim() ? `No results found for "${searchQuery}"` : 'No Conversations Yet'}
            </p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              {searchQuery.trim()
                ? 'Try searching by a different name or keywords.'
                : userRole === 'farmer'
                ? 'Connect directly with the VeggieConnect Seller to submit harvest lots, discuss farm-gate prices, or request pickup logistics.'
                : userRole === 'buyer'
                ? 'Connect directly with the VeggieConnect Seller for order inquiries, delivery status, and produce questions.'
                : 'No active conversations found. Conversations with farmers and buyers will appear here.'}
            </p>
            {userRole !== 'admin' && sanitizedContacts.length > 0 && (
              <button
                onClick={() => {
                  const seller = sanitizedContacts.find((c) => c.role === 'admin' || c.id === 'admin-main') || sanitizedContacts[0];
                  if (seller) {
                    onSelectPartner(seller);
                    if (setIsChatBoxOpen) setIsChatBoxOpen(true);
                  }
                }}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Chat with Seller</span>
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map(({ contact, lastMessage, unreadCount }) => {
            const hasUnread = unreadCount > 0;
            const isMe = lastMessage?.senderId === currentUserId;

            // Formatted preview snippet like Facebook Messenger
            let previewText = contact.isOnline !== false ? 'Active on Direct Chat' : `Offline · ${contact.lastActive || 'Seen recently'}`;
            if (lastMessage) {
              const prefix = isMe ? 'You: ' : `${lastMessage.senderName?.split(' ')[0] || ''}: `;
              previewText = `${prefix}${lastMessage.text}`;
            } else if (contact.role === 'admin' || contact.id === 'admin-main') {
              previewText = 'VeggieConnect Store Seller · Tap to chat';
            } else if (contact.role === 'farmer') {
              previewText = contact.farmName
                ? `${contact.farmName} · Tap to message`
                : 'Direct Farm Gate · Tap to message';
            } else {
              previewText = 'Buyer · Tap to message';
            }

            const timeString = lastMessage?.timestamp || (contact.isOnline !== false ? 'Online' : 'Offline');

            return (
              <div
                key={contact.id}
                id={`chat-thread-${contact.id}`}
                onClick={() => {
                  onSelectPartner(contact);
                  if (setIsChatBoxOpen) setIsChatBoxOpen(true);
                }}
                className="flex items-center gap-3 px-3.5 py-3 hover:bg-emerald-50/70 active:bg-emerald-100/60 transition-colors cursor-pointer group bg-white"
              >
                {/* Profile Picture with Online / Offline Status Badge */}
                <div className="relative flex-shrink-0">
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-13 h-13 rounded-full object-cover border border-emerald-200"
                    />
                  ) : (
                    <div
                      className={`w-13 h-13 rounded-full ${getAvatarBg(
                        contact.id
                      )} text-white font-bold text-base flex items-center justify-center shadow-inner`}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online / Offline Status Dot */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      contact.isOnline !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                    }`}
                  />
                </div>

                {/* Middle: Name & Last Message Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm truncate leading-snug flex items-center gap-1 ${
                        hasUnread ? 'font-bold text-emerald-950' : 'font-semibold text-neutral-800'
                      }`}
                    >
                      <span>{contact.name}</span>
                      {contact.verified && (
                        <span className="text-emerald-600 text-xs font-bold">✓</span>
                      )}
                    </h3>

                    {/* Timestamp */}
                    <span
                      className={`text-[11px] flex-shrink-0 ml-1 ${
                        hasUnread ? 'text-emerald-600 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {timeString}
                    </span>
                  </div>

                  {/* Last message preview line */}
                  <div className="flex items-center justify-between mt-0.5">
                    <p
                      className={`text-xs truncate max-w-[220px] leading-snug ${
                        hasUnread ? 'font-bold text-emerald-950' : 'text-neutral-500'
                      }`}
                    >
                      {previewText}
                    </p>

                    {/* Green/Emerald Unread Dot on the right */}
                    {hasUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {/* Role and territory tag */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                        contact.role === 'farmer'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}
                    >
                      {contact.role}
                    </span>
                    {contact.farmName && (
                      <span className="text-[10px] text-neutral-500 truncate font-medium">
                        {contact.farmName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
