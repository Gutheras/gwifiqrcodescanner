"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Camera, Upload, Wifi, Copy, Shield, Eye, EyeOff, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface WiFiCredentials {
  ssid: string
  password: string
  encryption: string
  hidden: boolean
}

export default function WiFiQRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [credentials, setCredentials] = useState<WiFiCredentials | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Parse WiFi QR code format: WIFI:T:<encryption>;S:<SSID>;P:<password>;H:<hidden>;
  const parseWiFiQR = (text: string): WiFiCredentials | null => {
    if (!text.startsWith("WIFI:")) {
      return null
    }

    const params: Record<string, string> = {}
    const parts = text.slice(5).split(";")

    for (const part of parts) {
      if (part.includes(":")) {
        const [key, ...valueParts] = part.split(":")
        params[key] = valueParts.join(":")
      }
    }

    return {
      ssid: params.S || "",
      password: params.P || "",
      encryption: params.T || "None",
      hidden: params.H === "true",
    }
  }

  const startCamera = async () => {
    try {
      setIsScanning(true)
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions or upload an image instead.")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError(null)

      // Create image element to load the file
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = async () => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        try {
          // Use a QR code library (jsQR) to decode
          const { default: jsQR } = await import("jsqr")
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code) {
            const wifiData = parseWiFiQR(code.data)
            if (wifiData) {
              setCredentials(wifiData)
              toast({
                title: "QR Code Scanned Successfully",
                description: `Found WiFi network: ${wifiData.ssid}`,
              })
            } else {
              setError("This QR code does not contain WiFi credentials.")
            }
          } else {
            setError("No QR code found in the image. Please try a clearer image.")
          }
        } catch (err) {
          setError("Failed to process the image. Please try again.")
        }
      }

      img.src = URL.createObjectURL(file)
    } catch (err) {
      setError("Failed to load the image. Please try again.")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "Password copied successfully",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the password manually",
        variant: "destructive",
      })
    }
  }

  const reset = () => {
    setCredentials(null)
    setError(null)
    setCopied(false)
    setShowPassword(false)
    stopCamera()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wifi className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">WiFi QR Scanner</h1>
          </div>
          <p className="text-muted-foreground text-balance">
            Scan or upload a WiFi QR code to extract network credentials securely
          </p>
        </div>

        {/* Privacy Notice */}
        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Privacy First:</strong> All processing happens locally in your browser. No data is stored or
            transmitted to any servers.
          </AlertDescription>
        </Alert>

        {/* Scanner Interface */}
        {!credentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>Use your camera to scan a WiFi QR code or upload an image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera View */}
              {isScanning && (
                <div className="relative">
                  <video ref={videoRef} className="w-full rounded-lg bg-muted" autoPlay playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!isScanning ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1 bg-transparent">
                    Stop Camera
                  </Button>
                )}

                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* WiFi Credentials Display */}
        {credentials && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                WiFi Credentials Found
              </CardTitle>
              <CardDescription>Network information extracted from QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Network Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Network Name (SSID)</label>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm">{credentials.ssid}</div>
              </div>

              {/* Password */}
              {credentials.password && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Password</label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                      {showPassword ? credentials.password : "•".repeat(credentials.password.length)}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(credentials.password)}
                      className={cn(copied && "bg-green-600 hover:bg-green-700")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Network Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Encryption</label>
                  <Badge variant={credentials.encryption === "None" ? "destructive" : "secondary"}>
                    {credentials.encryption || "None"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Hidden Network</label>
                  <Badge variant={credentials.hidden ? "outline" : "secondary"}>
                    {credentials.hidden ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              {/* Reset Button */}
              <Button onClick={reset} variant="outline" className="w-full bg-transparent">
                Scan Another QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hidden Canvas for Image Processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

        {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-sm text-muted-foreground border-t bg-background">
        <p>
          © {new Date().getFullYear()} All rights reserved | G-Scanner by{" "} 
          <a 
            href="https://gutheras.pages.dev/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Gutheras
          </a>
        </p>
      </footer>
    </div>
  )
}