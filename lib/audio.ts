// Audio management utility for the quiz game
class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.3; // Default volume (30%)

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles = {
      click: '/sounds/click.mp3',
      success: '/sounds/success.mp3',
      failure: '/sounds/failure.mp3',
    };

    Object.entries(soundFiles).forEach(([name, path]) => {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.volume;
        
        // Handle loading errors gracefully
        audio.addEventListener('error', () => {
          console.warn(`Failed to load sound: ${name} (${path})`);
        });

        this.sounds.set(name, audio);
      } catch (error) {
        console.warn(`Error creating audio for ${name}:`, error);
      }
    });
  }

  public play(soundName: string): void {
    if (!this.isEnabled) return;

    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      // Reset the audio to the beginning
      sound.currentTime = 0;
      
      // Play the sound
      const playPromise = sound.play();
      
      // Handle play promise (required for some browsers)
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented, which is normal
          console.debug(`Audio play prevented for ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    this.sounds.forEach((sound) => {
      sound.volume = this.volume;
    });
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  // Method to test if audio is working
  public testAudio(): void {
    this.play('click');
  }
}

// Create a singleton instance
export const audioManager = new AudioManager();

// Convenience functions for common sounds
export const playClickSound = () => audioManager.play('click');
export const playSuccessSound = () => audioManager.play('success');
export const playFailureSound = () => audioManager.play('failure');

// Hook for React components
export const useAudio = () => {
  return {
    playClick: playClickSound,
    playSuccess: playSuccessSound,
    playFailure: playFailureSound,
    setVolume: (volume: number) => audioManager.setVolume(volume),
    setEnabled: (enabled: boolean) => audioManager.setEnabled(enabled),
    isEnabled: () => audioManager.isAudioEnabled(),
    testAudio: () => audioManager.testAudio(),
  };
};