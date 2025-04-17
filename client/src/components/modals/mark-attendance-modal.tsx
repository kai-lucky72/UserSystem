import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Attendance } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface MarkAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeFrame: {
    startTime: string;
    endTime: string;
  };
}

// Insurance sector options
const INSURANCE_SECTORS = [
  { id: "health", name: "Health Insurance" },
  { id: "life", name: "Life Insurance" },
  { id: "auto", name: "Auto Insurance" },
  { id: "property", name: "Property Insurance" },
  { id: "business", name: "Business Insurance" },
  { id: "travel", name: "Travel Insurance" },
  { id: "sports", name: "Sports Insurance" },
  { id: "other", name: "Other" }
];

export function MarkAttendanceModal({ open, onOpenChange, timeFrame }: MarkAttendanceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sector, setSector] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [isCustomSector, setIsCustomSector] = useState<boolean>(false);
  const [customSector, setCustomSector] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check for existing attendance when modal opens
  useEffect(() => {
    if (open) {
      // Check for existing attendance to prevent duplicate submissions
      apiRequest("GET", "/api/attendance/status")
        .then(res => res.json())
        .then(data => {
          if (data.marked) {
            toast({
              title: "Already marked",
              description: `You've already marked attendance at ${data.time}`,
              variant: "destructive",
            });
            onOpenChange(false);
          }
        })
        .catch(err => {
          console.error("Error checking attendance status:", err);
        });
    }
  }, [open, onOpenChange, toast]);

  // Reset form when modal opens/closes
  const resetForm = () => {
    setSector("");
    setLocation("");
    setIsCustomSector(false);
    setCustomSector("");
    setIsSubmitting(false);
  };

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      // Double-check attendance status before submission
      const statusRes = await apiRequest("GET", "/api/attendance/status");
      const statusData = await statusRes.json();
      
      if (statusData.marked) {
        throw new Error("You've already marked attendance for today");
      }
      
      const finalSector = sector === "other" ? customSector : 
        INSURANCE_SECTORS.find(s => s.id === sector)?.name || sector;
      
      const res = await apiRequest("POST", "/api/attendance", {
        sector: finalSector,
        location: location,
        // Include agent ID to ensure attendance is marked for the correct agent
        userId: user?.id
      });
      
      return await res.json();
    },
    onSuccess: (data: Attendance) => {
      toast({
        title: "Success!",
        description: "Your attendance has been marked successfully.",
      });
      // Invalidate only this specific user's attendance status
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status", user?.id] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Format time to 12-hour format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: minutes > 0 ? '2-digit' : undefined,
      hour12: true
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sector) {
      toast({
        title: "Missing information",
        description: "Please select an insurance sector.",
        variant: "destructive",
      });
      return;
    }
    
    if (sector === "other" && !customSector.trim()) {
      toast({
        title: "Missing information",
        description: "Please specify the insurance sector.",
        variant: "destructive",
      });
      return;
    }
    
    if (!location.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your current working location.",
        variant: "destructive",
      });
      return;
    }
    
    markAttendanceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="text-sm text-gray-500 mb-4">
              You are marking attendance for today between {formatTime(timeFrame.startTime)} and {formatTime(timeFrame.endTime)}.
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sector" className="flex items-center">
                Insurance Sector
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <p className="text-xs text-gray-500 mb-1">Select the insurance sector you will be working in today</p>
              <Select
                value={sector}
                onValueChange={(value) => {
                  setSector(value);
                  setIsCustomSector(value === "other");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurance sector" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_SECTORS.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isCustomSector && (
              <div className="space-y-2">
                <Label htmlFor="customSector" className="flex items-center">
                  Specify Insurance Sector
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="customSector"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  placeholder="Enter the insurance sector"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center">
                Current Working Location
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <p className="text-xs text-gray-500 mb-1">Specify where you'll be working today (office, field, remote, etc.)</p>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, home, field, etc."
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={markAttendanceMutation.isPending || isSubmitting}
            >
              {markAttendanceMutation.isPending || isSubmitting ? "Marking..." : "Mark Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 