'use client';

import { useToast } from './useToast';

export function useFavToast() {
  const { toast } = useToast();
  
  return (action: 'add' | 'remove', jobTitle?: string) => {
    const title = jobTitle ? ` ${jobTitle}` : '';
    const message = action === 'add' 
      ? `Added${title} to favorites` 
      : `Removed${title} from favorites`;
    
        toast({
      message,
      type: action === 'add' ? 'success' : 'info',
      duration: 2000,
    });
  };
}