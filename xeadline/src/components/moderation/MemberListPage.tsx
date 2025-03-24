'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectCurrentTopic } from '../../redux/slices/topicSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { useUserProfileWithCache } from '../../hooks/useUserProfileWithCache';
import Image from 'next/image';
import Link from 'next/link';
import MemberRoleSelector from '../moderation/MemberRoleSelector';

// Define member roles
export type MemberRole = 'member' | 'contributor' | 'moderator' | 'admin';

// Define member interface
interface Member {
  pubkey: string;
  role: MemberRole;
  joinedAt: number;
  lastActive?: number;
}

interface MemberListPageProps {
  topicId: string;
}

// Member item component
const MemberItem = ({ 
  member, 
  isModerator, 
  onRoleChange 
}: { 
  member: Member; 
  isModerator: boolean;
  onRoleChange: (pubkey: string, newRole: MemberRole) => void;
}) => {
  const { username, profile } = useUserProfileWithCache(member.pubkey);
  
  // Generate a placeholder image if none is provided
  const imageUrl = profile?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || member.pubkey.substring(0, 8))}&background=random&size=128`;
  
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-4">
          <Image
            src={imageUrl}
            alt={username || member.pubkey.substring(0, 8)}
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
        <div>
          <Link
            href={`/profile/${member.pubkey}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {profile?.displayName || username || `${member.pubkey.substring(0, 8)}...`}
          </Link>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Joined {new Date(member.joinedAt * 1000).toLocaleDateString()}
          </div>
          {member.lastActive && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last active {new Date(member.lastActive * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center">
        <div className={`px-3 py-1 rounded-full text-sm font-medium mr-4 ${
          member.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          member.role === 'moderator' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          member.role === 'contributor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </div>
        
        {isModerator && (
          <MemberRoleSelector
            currentRole={member.role}
            pubkey={member.pubkey}
            onRoleChange={onRoleChange}
          />
        )}
      </div>
    </div>
  );
};

export default function MemberListPage({ topicId }: MemberListPageProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentTopic = useAppSelector(selectCurrentTopic);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'all'>('all');
  
  // Check if current user is a moderator
  const isModerator = currentTopic?.moderators.includes(currentUser?.publicKey || '') || false;
  
  useEffect(() => {
    if (topicId) {
      fetchMembers();
    }
  }, [topicId]);
  
  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would fetch members from the API
      // For now, we'll use mock data
      const mockMembers: Member[] = [
        // Moderators
        ...currentTopic?.moderators.map(pubkey => ({
          pubkey,
          role: 'moderator' as MemberRole,
          joinedAt: currentTopic.createdAt,
          lastActive: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7)
        })) || [],
        
        // Regular members
        ...[...Array(10)].map((_, i) => ({
          pubkey: `pubkey${i}`,
          role: ['member', 'contributor', 'member', 'member', 'member'][Math.floor(Math.random() * 5)] as MemberRole,
          joinedAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30),
          lastActive: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7)
        }))
      ];
      
      setMembers(mockMembers);
      setIsLoading(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch members');
      setIsLoading(false);
    }
  };
  
  const handleRoleChange = async (pubkey: string, newRole: MemberRole) => {
    try {
      // In a real implementation, you would update the member role via API
      // For now, we'll just update the local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.pubkey === pubkey ? { ...member, role: newRole } : member
        )
      );
      
      // If the role is moderator, we would need to update the topic moderators list
      if (newRole === 'moderator') {
        // This would be handled by a Redux action in a real implementation
        console.log(`Added ${pubkey} as moderator`);
      } else if (currentTopic?.moderators.includes(pubkey)) {
        // Remove from moderators if they were previously a moderator
        console.log(`Removed ${pubkey} from moderators`);
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to update member role');
    }
  };
  
  // Filter members based on search query and role filter
  const filteredMembers = members.filter(member => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesSearch = searchQuery === '' || member.pubkey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentTopic?.name} - Members
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {members.length} members
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as MemberRole | 'all')}
              className="w-full md:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="member">Members</option>
              <option value="contributor">Contributors</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bottle-green"></div>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <MemberItem
                key={member.pubkey}
                member={member}
                isModerator={isModerator}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300">No members found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}