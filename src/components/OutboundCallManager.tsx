import { useState, useEffect } from "react";
import { OutboundCall, OutboundCallConfig, BatchCallRequest } from "@/types/outbound";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallLogs } from "@/hooks/useCallLogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { PhoneOutgoing, Calendar as CalendarIcon, Clock, Users, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import OutboundCallHistory from "./OutboundCallHistory";

interface Contact {
  name: string;
  phone: string;
  email?: string;
}

interface OutboundCallManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  publicKey: string;
  assistantId: string;
  phoneNumberId: string;
}

const OutboundCallManager = ({
  open,
  onOpenChange,
  contacts,
  publicKey,
  assistantId,
  phoneNumberId,
}: OutboundCallManagerProps) => {
  const { saveCallLog, updateCallLog } = useCallLogs();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [outboundCalls, setOutboundCalls] = useState<OutboundCall[]>([]);
  const [batchMode, setBatchMode] = useState(true);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [callsInProgress, setCallsInProgress] = useState(0);
  const [currentTab, setCurrentTab] = useState("configure");

  const MAX_CONCURRENT_CALLS = 10;
  const CALL_DELAY_MS = 2000;

  useEffect(() => {
    if (!open) {
      setSelectedContacts([]);
      setHasConsent(false);
      setScheduleDate(undefined);
      setScheduleTime("");
      setCurrentTab("configure");
    }
  }, [open]);

  useEffect(() => {
    const activeCount = outboundCalls.filter((call) =>
      ["queued", "ringing", "in-progress"].includes(call.status)
    ).length;
    setCallsInProgress(activeCount);
  }, [outboundCalls]);

  useEffect(() => {
    if (callsInProgress === 0 || currentTab !== "monitor") return;

    const pollInterval = setInterval(async () => {
      const activeCalls = outboundCalls.filter((call) =>
        ["queued", "ringing", "in-progress"].includes(call.status)
      );

      for (const call of activeCalls) {
        await monitorCallStatus(call.id);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [callsInProgress, outboundCalls, currentTab]);

  const toggleContactSelection = (phone: string) => {
    setSelectedContacts((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.phone));
    }
  };

  const makeOutboundCall = async (config: OutboundCallConfig): Promise<OutboundCall> => {
    try {
      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to initiate call");
      }

      const callData = await response.json();
      
      const newCall: OutboundCall = {
        id: callData.id,
        status: callData.status || "queued",
        customer: config.customer,
        scheduledAt: config.schedulePlan?.earliestAt ? new Date(config.schedulePlan.earliestAt) : undefined,
        startedAt: callData.startedAt ? new Date(callData.startedAt) : undefined,
      };

      // Save to database
      try {
        await saveCallLog(newCall);
      } catch (dbError) {
        console.error('[OutboundCallManager] Error saving to database:', dbError);
      }

      setOutboundCalls((prev) => [...prev, newCall]);
      return newCall;
    } catch (error) {
      console.error("Error making outbound call:", error);
      throw error;
    }
  };

  const makeBatchCalls = async (batchConfig: BatchCallRequest) => {
    try {
      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to initiate batch calls");
      }

      const callsData = await response.json();
      
      const newCalls: OutboundCall[] = (Array.isArray(callsData) ? callsData : [callsData]).map((callData: any) => ({
        id: callData.id,
        status: callData.status || "queued",
        customer: batchConfig.customers.find((c) => c.number === callData.customer?.number) || batchConfig.customers[0],
        scheduledAt: batchConfig.schedulePlan?.earliestAt ? new Date(batchConfig.schedulePlan.earliestAt) : undefined,
        startedAt: callData.startedAt ? new Date(callData.startedAt) : undefined,
      }));

      // Save all calls to database
      for (const call of newCalls) {
        try {
          await saveCallLog(call);
        } catch (dbError) {
          console.error('[OutboundCallManager] Error saving batch call to database:', dbError);
        }
      }

      setOutboundCalls((prev) => [...prev, ...newCalls]);
      return newCalls;
    } catch (error) {
      console.error("Error making batch calls:", error);
      throw error;
    }
  };

  const monitorCallStatus = async (callId: string) => {
    try {
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: {
          Authorization: `Bearer ${publicKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch call status");
      }

      const callData = await response.json();

      const updatedCall = {
        status: callData.status,
        startedAt: callData.startedAt ? new Date(callData.startedAt) : undefined,
        endedAt: callData.endedAt ? new Date(callData.endedAt) : undefined,
        duration: callData.duration,
        error: callData.error,
        analysis: callData.analysis,
      };

      // Update in database
      try {
        await updateCallLog(callId, updatedCall);
      } catch (dbError) {
        console.error('[OutboundCallManager] Error updating database:', dbError);
      }

      setOutboundCalls((prev) =>
        prev.map((call) =>
          call.id === callId
            ? {
                ...call,
                ...updatedCall,
              }
            : call
        )
      );

      if (callData.status === "ended") {
        const call = outboundCalls.find((c) => c.id === callId);
        if (call) {
          if (callData.error) {
            toast({
              title: "Chamada falhou",
              description: `${call.customer.name || call.customer.number}: ${callData.error}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Chamada concluída",
              description: `${call.customer.name || call.customer.number} - Duração: ${callData.duration}s`,
            });
          }
        }
      }

      return callData;
    } catch (error) {
      console.error("Error monitoring call:", error);
    }
  };

  const handleStartCalls = async () => {
    if (!publicKey || !assistantId || !phoneNumberId) {
      toast({
        title: "Configuração incompleta",
        description: "Configure as credenciais Vapi antes de fazer chamadas",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.length === 0) {
      toast({
        title: "Nenhum contato selecionado",
        description: "Selecione pelo menos um contato para chamar",
        variant: "destructive",
      });
      return;
    }

    if (!hasConsent) {
      toast({
        title: "Consentimento necessário",
        description: "Você deve confirmar que obteve consentimento dos contatos",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const schedulePlan = scheduleDate && scheduleTime
        ? {
            earliestAt: new Date(
              `${format(scheduleDate, "yyyy-MM-dd")}T${scheduleTime}:00.000Z`
            ).toISOString(),
          }
        : undefined;

      const customers = selectedContacts.map((phone) => {
        const contact = contacts.find((c) => c.phone === phone);
        return {
          number: phone,
          name: contact?.name,
        };
      });

      if (batchMode) {
        await makeBatchCalls({
          assistantId,
          phoneNumberId,
          customers,
          schedulePlan,
        });

        toast({
          title: schedulePlan ? "Chamadas agendadas" : "Chamadas iniciadas",
          description: `${customers.length} ${schedulePlan ? "chamadas agendadas" : "chamadas em lote iniciadas"}`,
        });
      } else {
        const chunks = [];
        for (let i = 0; i < customers.length; i += MAX_CONCURRENT_CALLS) {
          chunks.push(customers.slice(i, i + MAX_CONCURRENT_CALLS));
        }

        for (const chunk of chunks) {
          await Promise.all(
            chunk.map((customer) =>
              makeOutboundCall({
                assistantId,
                phoneNumberId,
                customer,
                schedulePlan,
              })
            )
          );

          if (chunks.indexOf(chunk) < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, CALL_DELAY_MS));
          }
        }

        toast({
          title: schedulePlan ? "Chamadas agendadas" : "Chamadas iniciadas",
          description: `${customers.length} ${schedulePlan ? "chamadas agendadas individualmente" : "chamadas iniciadas"}`,
        });
      }

      setCurrentTab("monitor");
      setHasConsent(false);
    } catch (error) {
      console.error("Error starting calls:", error);
      toast({
        title: "Erro ao iniciar chamadas",
        description: error instanceof Error ? error.message : "Ocorreu um erro",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedCalls = outboundCalls.filter((c) => c.status === "ended").length;
  const progress = outboundCalls.length > 0 ? (completedCalls / outboundCalls.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5" />
            Chamadas Outbound
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configurar</TabsTrigger>
            <TabsTrigger value="monitor">
              Monitorar {callsInProgress > 0 && `(${callsInProgress})`}
            </TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Selecionar Contatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedContacts.length === contacts.length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Selecionar todos ({contacts.length} contatos)
                      </Label>
                    </div>
                    <Badge variant="secondary">
                      {selectedContacts.length} selecionados
                    </Badge>
                  </div>

                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div
                          key={contact.phone}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            id={contact.phone}
                            checked={selectedContacts.includes(contact.phone)}
                            onCheckedChange={() => toggleContactSelection(contact.phone)}
                          />
                          <Label htmlFor={contact.phone} className="flex-1 cursor-pointer">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {contact.phone}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modo de Chamada</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={batchMode ? "batch" : "individual"}
                  onValueChange={(value) => setBatchMode(value === "batch")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="batch" id="batch" />
                    <Label htmlFor="batch" className="cursor-pointer">
                      <div>
                        <p className="font-medium">Lote (Batch)</p>
                        <p className="text-sm text-muted-foreground">
                          Múltiplas chamadas simultâneas - mais rápido
                        </p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="cursor-pointer">
                      <div>
                        <p className="font-medium">Individual</p>
                        <p className="text-sm text-muted-foreground">
                          Uma chamada por vez com delay - mais controlado
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Agendar Chamadas (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="mt-2"
                    />
                    {scheduleDate && scheduleTime && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Chamadas serão iniciadas em:{" "}
                        {format(scheduleDate, "dd/MM/yyyy")} às {scheduleTime}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aviso de Conformidade Legal (TCPA)</AlertTitle>
              <AlertDescription>
                É ilegal fazer chamadas automatizadas sem consentimento explícito. Você é
                responsável por garantir conformidade com leis de telemarketing.
                Violações podem resultar em multas significativas.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                id="consent"
                checked={hasConsent}
                onCheckedChange={(checked) => setHasConsent(checked as boolean)}
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer">
                Confirmo que obtive consentimento explícito de todos os contatos
                selecionados para receber chamadas automatizadas
              </Label>
            </div>

            <Button
              onClick={handleStartCalls}
              disabled={
                !hasConsent ||
                selectedContacts.length === 0 ||
                isProcessing ||
                !publicKey ||
                !assistantId ||
                !phoneNumberId
              }
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : scheduleDate ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Agendar {selectedContacts.length} Chamadas
                </>
              ) : (
                <>
                  <PhoneOutgoing className="mr-2 h-4 w-4" />
                  Iniciar {selectedContacts.length} Chamadas Agora
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Chamadas em Andamento</CardTitle>
                  <Badge variant={callsInProgress > 0 ? "default" : "secondary"}>
                    {callsInProgress} ativas
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progresso</span>
                    <span>
                      {completedCalls} / {outboundCalls.length}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {outboundCalls.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma chamada iniciada ainda
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {outboundCalls
                        .filter((call) =>
                          ["queued", "ringing", "in-progress"].includes(call.status)
                        )
                        .map((call) => (
                          <div
                            key={call.id}
                            className="border rounded-lg p-4 bg-muted/50"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">
                                  {call.customer.name || "Sem nome"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {call.customer.number}
                                </p>
                              </div>
                              <Badge>
                                {call.status === "queued" && (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Na fila
                                  </>
                                )}
                                {call.status === "ringing" && (
                                  <>
                                    <PhoneOutgoing className="h-3 w-3 mr-1 animate-pulse" />
                                    Chamando...
                                  </>
                                )}
                                {call.status === "in-progress" && (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Em andamento
                                  </>
                                )}
                              </Badge>
                            </div>

                            {call.status === "in-progress" && call.duration && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                Duração: {formatDuration(call.duration)}
                              </p>
                            )}
                          </div>
                        ))}

                      {outboundCalls
                        .filter((call) => call.status === "ended")
                        .slice(-5)
                        .map((call) => (
                          <div
                            key={call.id}
                            className="border rounded-lg p-4 opacity-60"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">
                                  {call.customer.name || "Sem nome"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {call.customer.number}
                                </p>
                              </div>
                              <Badge
                                variant={call.error ? "destructive" : "default"}
                              >
                                {call.error ? (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Falhou
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Concluído
                                  </>
                                )}
                              </Badge>
                            </div>
                            {call.duration && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                Duração: {formatDuration(call.duration)}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <OutboundCallHistory calls={outboundCalls} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OutboundCallManager;
