import * as React from "react"
import { Button, ButtonProps } from "./button"
import { playClickSound } from "@/lib/audio"

// Enhanced Button component with sound effects
export interface SoundButtonProps extends ButtonProps {
  playSound?: boolean
  soundType?: 'click' | 'success' | 'failure'
}

const SoundButton = React.forwardRef<HTMLButtonElement, SoundButtonProps>(
  ({ className, onClick, playSound = true, soundType = 'click', ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Play sound effect if enabled
      if (playSound && typeof window !== 'undefined') {
        if (soundType === 'click') {
          playClickSound()
        }
        // Note: success and failure sounds are handled separately in game logic
      }

      // Call the original onClick handler
      if (onClick) {
        onClick(event)
      }
    }

    return (
      <Button
        ref={ref}
        className={className}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
SoundButton.displayName = "SoundButton"

export { SoundButton }