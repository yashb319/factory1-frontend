"use client";

import { useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSendSaasMarketingMutation } from "../api/saasAdminApi";

export function SaasMarketingPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendMarketing, { isLoading }] = useSendSaasMarketingMutation();

  function openConfirm() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleSend() {
    try {
      const result = await sendMarketing({
        subject: subject.trim(),
        body: body.trim(),
      }).unwrap();

      toast.success(result.message || "Marketing email sent to all factory owners");
      setSubject("");
      setBody("");
      setConfirmOpen(false);
    } catch {
      toast.error("Could not send marketing email");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SaaS Marketing</h1>
        <p className="text-sm text-slate-500">
          Send an email to every active factory owner about new features, offers or updates.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Subject</span>
            <Input
              className="h-10"
              placeholder="New in Factory1: AI Production Insights"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Message</span>
            <Textarea
              className="min-h-48"
              placeholder="Hi owner, we just shipped..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>

          <div className="flex justify-end">
            <Button type="button" onClick={openConfirm} disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send to all owners
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send marketing email to all factory owners?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This sends your message to every active factory owner on the platform.
              Make sure the content is final before sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={handleSend}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Megaphone size={16} />
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
