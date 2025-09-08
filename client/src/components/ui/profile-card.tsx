import { User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// A simplified user type that matches what we receive in the match data
interface SimpleUser {
  id: number;
  username: string;
  fullName: string;
  photoUrl?: string;
  profession?: string | null;
  location?: string | null;
  ethnicity?: string | null;
  isOnline?: boolean;
}

interface ProfileCardProps {
  user: User | SimpleUser;
  onClick?: () => void;
  lastMessage?: string;
  lastMessageTime?: string;
  small?: boolean;
}

export function ProfileCard({ user, onClick, lastMessage, lastMessageTime, small = false }: ProfileCardProps) {
  if (small) {
    return (
      <div className="flex flex-col items-center" onClick={onClick}>
        <div className="relative">
          <img 
            src={user.photoUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
            className="w-16 h-16 rounded-full object-cover border-2 border-primary" 
            alt={`${user.fullName}'s profile`} 
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
            <i className="fas fa-comment"></i>
          </div>
        </div>
        <span className="text-xs mt-1">{user.fullName.split(" ")[0]}</span>
      </div>
    );
  }

  if (lastMessage) {
    return (
      <div className="flex items-center py-3 border-b" onClick={onClick}>
        <img 
          src={user.photoUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
          className="w-14 h-14 rounded-full object-cover mr-3" 
          alt={`${user.fullName}'s profile`} 
        />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h4 className="font-semibold">{user.fullName.split(" ")[0]}</h4>
            <span className="text-xs text-gray-500">{lastMessageTime}</span>
          </div>
          <p className="text-sm text-gray-600 truncate">{lastMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="profile-card cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start">
          <img 
            src={user.photoUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
            className="w-16 h-16 rounded-full object-cover mr-4" 
            alt={`${user.fullName}'s profile`} 
          />
          <div>
            <h3 className="font-heading text-lg font-semibold">{user.fullName}</h3>
            {user.profession && <p className="text-sm text-gray-600">{user.profession}</p>}
            <div className="flex mt-2">
              {user.location && (
                <Badge variant="outline" className="mr-2 text-xs">
                  <i className="fas fa-map-marker-alt mr-1"></i> {user.location}
                </Badge>
              )}
              {user.ethnicity && (
                <Badge variant="outline" className="text-xs">
                  {user.ethnicity}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
