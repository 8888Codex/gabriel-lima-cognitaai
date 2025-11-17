import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark as BookmarkIcon, Trash2, Edit, Sparkles } from "lucide-react";
import { useBookmarks, Bookmark } from "@/hooks/useBookmarks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface BookmarkManagerProps {
  callLogId: string;
  currentTime: number;
  onSeek?: (time: number) => void;
}

const categoryColors: Record<string, string> = {
  inicio: "#10b981",
  problema: "#ef4444",
  solucao: "#3b82f6",
  objecao: "#f59e0b",
  acordo: "#8b5cf6",
  conclusao: "#06b6d4",
  outro: "#6b7280",
};

const categoryLabels: Record<string, string> = {
  inicio: "Início",
  problema: "Problema",
  solucao: "Solução",
  objecao: "Objeção",
  acordo: "Acordo",
  conclusao: "Conclusão",
  outro: "Outro",
};

export const BookmarkManager = ({ callLogId, currentTime, onSeek }: BookmarkManagerProps) => {
  const { bookmarks, isLoading, addBookmark, updateBookmark, deleteBookmark, generateAutoBookmarks } = useBookmarks(callLogId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    category: "outro",
    color: "#3b82f6",
  });

  const handleAddBookmark = async () => {
    if (!formData.label) return;
    
    await addBookmark(
      currentTime,
      formData.label,
      formData.description,
      formData.category,
      formData.color
    );
    
    setIsAddDialogOpen(false);
    setFormData({ label: "", description: "", category: "outro", color: "#3b82f6" });
  };

  const handleUpdateBookmark = async () => {
    if (!editingBookmark) return;
    
    await updateBookmark(editingBookmark.id, formData);
    setEditingBookmark(null);
    setFormData({ label: "", description: "", category: "outro", color: "#3b82f6" });
  };

  const startEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      label: bookmark.label,
      description: bookmark.description || "",
      category: bookmark.category || "outro",
      color: bookmark.color || "#3b82f6",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BookmarkIcon className="h-4 w-4" />
          Marcadores ({bookmarks.length})
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={generateAutoBookmarks}
            disabled={isLoading}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Gerar com IA
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <BookmarkIcon className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
              style={{ borderLeftColor: bookmark.color, borderLeftWidth: '3px' }}
              onClick={() => onSeek?.(bookmark.timestamp)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatTime(bookmark.timestamp)}
                    </span>
                    {bookmark.is_auto_generated && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-2 w-2 mr-1" />
                        IA
                      </Badge>
                    )}
                    {bookmark.category && (
                      <Badge 
                        style={{ backgroundColor: categoryColors[bookmark.category] }}
                        className="text-xs text-white"
                      >
                        {categoryLabels[bookmark.category]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{bookmark.label}</p>
                  {bookmark.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {bookmark.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(bookmark);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Dialog Adicionar/Editar */}
      <Dialog open={isAddDialogOpen || !!editingBookmark} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingBookmark(null);
          setFormData({ label: "", description: "", category: "outro", color: "#3b82f6" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBookmark ? 'Editar Marcador' : 'Adicionar Marcador'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ex: Cliente descreve problema"
                maxLength={30}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Adicione detalhes sobre este momento..."
                maxLength={100}
                rows={3}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: categoryColors[key] }}
                        />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingBookmark && (
              <div className="text-xs text-muted-foreground">
                Tempo atual: {formatTime(currentTime)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setEditingBookmark(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={editingBookmark ? handleUpdateBookmark : handleAddBookmark}>
              {editingBookmark ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
