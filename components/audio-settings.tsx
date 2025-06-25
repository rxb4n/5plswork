"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'
import { Volume2, VolumeX, TestTube } from 'lucide-react'
import { useAudio } from '@/lib/audio'

export function AudioSettings() {
  const audio = useAudio()
  const [volume, setVolume] = useState(30)
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Load settings from localStorage
    const savedVolume = localStorage.getItem('quiz-audio-volume')
    const savedEnabled = localStorage.getItem('quiz-audio-enabled')
    
    if (savedVolume) {
      const vol = parseInt(savedVolume)
      setVolume(vol)
      audio.setVolume(vol / 100)
    }
    
    if (savedEnabled !== null) {
      const enabled = savedEnabled === 'true'
      setIsEnabled(enabled)
      audio.setEnabled(enabled)
    }
  }, [audio])

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    audio.setVolume(newVolume / 100)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz-audio-volume', newVolume.toString())
    }
  }

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled)
    audio.setEnabled(enabled)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz-audio-enabled', enabled.toString())
    }
  }

  const handleTestAudio = () => {
    audio.testAudio()
  }

  return (
    <Card className="w-full max-w-md mobile-card">
      <CardHeader className="mobile-padding">
        <CardTitle className="flex items-center gap-2 mobile-text-lg">
          {isEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          Audio Settings
        </CardTitle>
        <CardDescription className="mobile-text-base">
          Configure sound effects for the quiz game
        </CardDescription>
      </CardHeader>
      <CardContent className="mobile-spacing-md mobile-padding">
        {/* Enable/Disable Audio */}
        <div className="flex items-center justify-between">
          <div className="mobile-spacing-sm flex-1 min-w-0">
            <label className="mobile-text-base font-medium">Enable Sound Effects</label>
            <p className="mobile-text-sm text-muted-foreground">
              Turn on/off all game sounds
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
            className="mobile-touch-target"
          />
        </div>

        {/* Volume Control */}
        <div className="mobile-spacing-sm">
          <div className="flex items-center justify-between">
            <label className="mobile-text-base font-medium">Volume</label>
            <span className="mobile-text-sm text-muted-foreground">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            min={0}
            step={5}
            disabled={!isEnabled}
            className="w-full mobile-touch-target"
          />
        </div>

        {/* Test Audio */}
        <Button
          onClick={handleTestAudio}
          variant="outline"
          disabled={!isEnabled}
          className="mobile-btn-md w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Audio
        </Button>

        {/* Audio Info */}
        <div className="mobile-text-sm text-muted-foreground mobile-spacing-sm">
          <p>• Click sounds play when pressing buttons</p>
          <p>• Success chimes play for correct answers</p>
          <p>• Buzzer sounds play for incorrect answers</p>
        </div>
      </CardContent>
    </Card>
  )
}