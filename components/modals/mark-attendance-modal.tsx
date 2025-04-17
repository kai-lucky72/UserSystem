import React, { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';

const MarkAttendanceModal = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [customSector, setCustomSector] = useState('');

  // Check for existing attendance when modal opens
  useEffect(() => {
    if (open && user?.id) {
      setIsSubmitting(true);
      // Direct API request (bypassing cache) to ensure we have fresh data
      fetch(`/api/attendance/status?userId=${user.id}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.marked) {
            toast({
              title: "Already marked",
              description: `You've already marked attendance at ${data.time}`,
              variant: "destructive",
            });
            setOpen(false);
          }
          setIsSubmitting(false);
        })
        .catch(err => {
          console.error("Error checking attendance status:", err);
          setIsSubmitting(false);
        });
    }
  }, [open, setOpen, toast, user?.id]);

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Double-check attendance status before submission with direct API call
      const statusRes = await fetch(`/api/attendance/status?userId=${user.id}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const statusData = await statusRes.json();
      
      if (statusData.marked) {
        throw new Error("You've already marked attendance for today");
      }
      
      const finalSector = sector === "other" ? customSector : 
        INSURANCE_SECTORS.find(s => s.id === sector)?.name || sector;
      
      const res = await apiRequest("POST", "/api/attendance", {
        sector: finalSector,
        location: location,
        userId: user.id // Explicitly pass the user ID
      });
      
      return await res.json();
    },
    // ... existing code ...
  });

  return (
    // ... existing code ...
  );
};

export default MarkAttendanceModal; 