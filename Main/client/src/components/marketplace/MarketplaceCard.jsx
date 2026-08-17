import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Bookmark, UserCircle, MapPin } from 'lucide-react';

export const MarketplaceCard = ({ item, isSaved, onToggleSave, onContact }) => (
  <Card className="p-4 border-slate-200/80 flex flex-col h-full hoverEffect">
    <div className="flex-1 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-trust-ink line-clamp-1">{item.title || 'Untitled Service'}</h4>
        <button
          type="button"
          onClick={() => onToggleSave(item.id)}
          className="p-1 text-trust-slate hover:text-trust-verified transition-colors"
          aria-label={isSaved ? 'Remove from bookmarks' : 'Save to bookmarks'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-trust-verified text-trust-verified' : 'fill-none'}`} />
        </button>
      </div>
      <p className="text-[11px] text-trust-slate line-clamp-2 leading-relaxed">{item.description || 'No description provided.'}</p>
      <div className="flex items-center gap-2">
        <Badge variant="slate" size="sm">{item.category || 'Service'}</Badge>
        {item.startup?.name && (
          <div className="flex items-center gap-1 text-[10px] text-trust-slate font-semibold">
            <UserCircle className="w-3 h-3" />
            <span>{item.startup.name}</span>
          </div>
        )}
      </div>
    </div>
    <Button
      variant="primary"
      size="sm"
      className="mt-3 w-full"
      onClick={() => onContact(item)}
    >
      <span>Contact Founder</span>
    </Button>
  </Card>
);
