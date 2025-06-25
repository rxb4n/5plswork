import * as React from "react"
import { Button, ButtonProps } from "./button"
import { useAudio } from "@/lib/audio"

// Enhanced Button component with sound effects and proper audio handling
export interface SoundButtonProps extends ButtonProps {
  playSound?: boolean
  soundType?: 'click' | 'success' | 'failure'
}

const SoundButton = React.forwardRef<HTMLButtonElement, SoundButtonProps>(
  ({ className, onClick, playSound = true, soundType = 'click', children, ...props }, ref) => {
    const audio = useAudio();
    const [isPlaying, setIsPlaying] = React.useState(false);

    // Enable audio context on first user interaction
    React.useEffect(() => {
      const enableAudio = async () => {
        try {
          await audio.enableAudioContext();
        } catch (error) {
          console.warn('Failed to enable audio context:', error);
        }
      };
      
      // Enable on component mount if not already done
      enableAudio();
    }, [audio]);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      console.log(`🖱️ [SOUND-BUTTON] Button clicked, sound enabled: ${playSound}, type: ${soundType}`);
      
      // Play sound effect if enabled
      if (playSound && typeof window !== 'undefined' && !isPlaying) {
        setIsPlaying(true);
        
        try {
          if (soundType === 'click') {
            await audio.playClick();
          } else if (soundType === 'success') {
            await audio.playSuccess();
          } else if (soundType === 'failure') {
            await audio.playFailure();
          }
        } catch (error) {
          console.warn('Failed to play sound:', error);
        } finally {
          // Reset playing state after a short delay
          setTimeout(() => setIsPlaying(false), 100);
        }
      }

      // Call the original onClick handler
      if (onClick) {
        onClick(event);
      }
    };

    return (
      <Button
        ref={ref}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
SoundButton.displayName = "SoundButton";

export { SoundButton };