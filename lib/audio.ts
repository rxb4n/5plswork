// Enhanced audio management utility for the quiz game
class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.3; // Default volume (30%)
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializationPromise = this.preloadSounds();
    }
  }

  private async preloadSounds(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔊 [AUDIO] Initializing audio manager...');
    
    const soundFiles = {
      click: '/sounds/click.mp3',
      success: '/sounds/success.mp3',
      failure: '/sounds/failure.mp3',
    };

    const loadPromises = Object.entries(soundFiles).map(([name, path]) => {
      return new Promise<void>((resolve, reject) => {
        try {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.volume = this.volume;
          
          // Handle successful loading
          audio.addEventListener('canplaythrough', () => {
            console.log(`✅ [AUDIO] Loaded sound: ${name}`);
            this.sounds.set(name, audio);
            resolve();
          });

          // Handle loading errors
          audio.addEventListener('error', (e) => {
            console.warn(`⚠️ [AUDIO] Failed to load sound: ${name} (${path})`, e);
            // Don't reject - continue with other sounds
            resolve();
          });

          // Set source after event listeners
          audio.src = path;
          
          // Fallback timeout
          setTimeout(() => {
            if (!this.sounds.has(name)) {
              console.warn(`⏰ [AUDIO] Timeout loading sound: ${name}`);
              resolve();
            }
          }, 5000);

        } catch (error) {
          console.warn(`❌ [AUDIO] Error creating audio for ${name}:`, error);
          resolve(); // Don't fail the entire initialization
        }
      });
    });

    try {
      await Promise.all(loadPromises);
      this.isInitialized = true;
      console.log(`✅ [AUDIO] Audio manager initialized with ${this.sounds.size} sounds`);
    } catch (error) {
      console.error('❌ [AUDIO] Failed to initialize audio manager:', error);
      this.isInitialized = true; // Mark as initialized to prevent retries
    }
  }

  public async play(soundName: string): Promise<void> {
    if (typeof window === 'undefined' || !this.isEnabled) {
      console.log(`🔇 [AUDIO] Audio disabled or not in browser, skipping: ${soundName}`);
      return;
    }

    // Ensure initialization is complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`🔍 [AUDIO] Sound not found: ${soundName}. Available sounds:`, Array.from(this.sounds.keys()));
      return;
    }

    try {
      console.log(`🔊 [AUDIO] Playing sound: ${soundName}`);
      
      // Reset the audio to the beginning
      sound.currentTime = 0;
      sound.volume = this.volume;
      
      // Play the sound
      const playPromise = sound.play();
      
      // Handle play promise (required for some browsers)
      if (playPromise !== undefined) {
        await playPromise;
        console.log(`✅ [AUDIO] Successfully played: ${soundName}`);
      }
    } catch (error) {
      // Auto-play was prevented or other error occurred
      console.warn(`⚠️ [AUDIO] Failed to play sound ${soundName}:`, error);
      
      // Try to enable audio on user interaction
      if (error.name === 'NotAllowedError') {
        console.log('🎵 [AUDIO] Audio blocked by browser - will retry on next user interaction');
      }
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    console.log(`🔊 [AUDIO] Volume set to: ${Math.round(this.volume * 100)}%`);
    
    this.sounds.forEach((sound, name) => {
      sound.volume = this.volume;
    });
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`🔊 [AUDIO] Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  public getLoadedSounds(): string[] {
    return Array.from(this.sounds.keys());
  }

  // Method to test if audio is working
  public async testAudio(): Promise<void> {
    console.log('🧪 [AUDIO] Testing audio playback...');
    await this.play('click');
  }

  // Method to handle user interaction for enabling audio
  public async enableAudioContext(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Create a silent audio context to enable audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('🎵 [AUDIO] Audio context resumed');
      }
      audioContext.close();
    } catch (error) {
      console.warn('⚠️ [AUDIO] Failed to enable audio context:', error);
    }
  }
}

// Create a singleton instance
let audioManagerInstance: AudioManager | null = null;

export const getAudioManager = (): AudioManager => {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
};

// Convenience functions for common sounds with enhanced logging
export const playClickSound = async () => {
  console.log('🖱️ [AUDIO] Click sound requested');
  await getAudioManager().play('click');
};

export const playSuccessSound = async () => {
  console.log('✅ [AUDIO] Success sound requested');
  await getAudioManager().play('success');
};

export const playFailureSound = async () => {
  console.log('❌ [AUDIO] Failure sound requested');
  await getAudioManager().play('failure');
};

// Hook for React components with enhanced functionality
export const useAudio = () => {
  const audioManager = getAudioManager();
  
  return {
    playClick: playClickSound,
    playSuccess: playSuccessSound,
    playFailure: playFailureSound,
    setVolume: (volume: number) => audioManager.setVolume(volume),
    setEnabled: (enabled: boolean) => audioManager.setEnabled(enabled),
    isEnabled: () => audioManager.isAudioEnabled(),
    testAudio: () => audioManager.testAudio(),
    enableAudioContext: () => audioManager.enableAudioContext(),
    getLoadedSounds: () => audioManager.getLoadedSounds(),
  };
};