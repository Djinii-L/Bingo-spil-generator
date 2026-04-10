import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCcw, Play, Grid2X2, Sparkles, Hash, Printer, FileText, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, BorderStyle, PageBreak } from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function Home() {
  // === Card Builder State ===
  const [wordsText, setWordsText] = useState("Apple, Banana, Cherry, Dog, Elephant, Frog, Giraffe, Hat, Ice, Jelly, Kite, Lemon, Monkey, Nest, Orange, Penguin, Queen, Rabbit, Snake, Tiger, Umbrella, Violin, Water, X-ray, Yak, Zebra");
  const [cols, setCols] = useState(5); // Y (3 to 8)
  const [rows, setRows] = useState(5); // X (2 to 5)
  const [cardCount, setCardCount] = useState(3);
  const [generatedCards, setGeneratedCards] = useState<string[][][]>([]);
  
  // === Game Player State ===
  const [pool, setPool] = useState<string[]>([]);
  const [pulled, setPulled] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);

  const parsedWords = useMemo(() => {
    return wordsText
      .split(/[\n,]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }, [wordsText]);

  // Sync game pool with words when not actively playing or empty
  useEffect(() => {
    if (pool.length === 0 && pulled.length === 0) {
      setPool(shuffleArray(parsedWords));
    }
  }, [parsedWords, pool.length, pulled.length]);

  const handleGenerateCards = () => {
    const requiredWords = cols * rows;
    if (parsedWords.length < requiredWords) {
      toast.error(`Not enough words! You need at least ${requiredWords} words for a ${cols}x${rows} grid, but only have ${parsedWords.length}.`);
      return;
    }

    if (cardCount < 1 || cardCount > 100) {
      toast.error("Please select a number of cards between 1 and 100.");
      return;
    }

    const newCards: string[][][] = [];
    for (let i = 0; i < cardCount; i++) {
      const shuffled = shuffleArray(parsedWords);
      const cardWords = shuffled.slice(0, requiredWords);
      
      // Create grid
      const grid: string[][] = [];
      for (let r = 0; r < rows; r++) {
        grid.push(cardWords.slice(r * cols, (r + 1) * cols));
      }
      newCards.push(grid);
    }
    
    setGeneratedCards(newCards);
    toast.success(`Generated ${cardCount} Bingo cards!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = async () => {
    if (generatedCards.length === 0) return;

    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 2 },
      bottom: { style: BorderStyle.SINGLE, size: 2 },
      left: { style: BorderStyle.SINGLE, size: 2 },
      right: { style: BorderStyle.SINGLE, size: 2 },
    };

    const cardSections: (Paragraph | Table)[] = [];

    generatedCards.forEach((card, cardIdx) => {
      if (cardIdx > 0) {
        cardSections.push(
          new Paragraph({ children: [new PageBreak()] })
        );
      }

      cardSections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "BINGO", bold: true, size: 48, font: "Arial" }),
          ],
        })
      );

      cardSections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({ text: `Card #${cardIdx + 1}`, size: 20, color: "666666", font: "Arial" }),
          ],
        })
      );

      const tableRows = card.map((row) =>
        new TableRow({
          children: row.map((word) =>
            new TableCell({
              borders: cellBorder,
              width: { size: Math.floor(9000 / cols), type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 200, after: 200 },
                  children: [
                    new TextRun({ text: word, bold: true, size: 22, font: "Arial" }),
                  ],
                }),
              ],
            })
          ),
        })
      );

      cardSections.push(
        new Table({
          rows: tableRows,
          width: { size: 9000, type: WidthType.DXA },
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          children: cardSections,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "bingo-cards.docx");
    toast.success("Word document downloaded!");
  };

  const handleDownloadExcel = () => {
    if (generatedCards.length === 0) return;

    const wb = XLSX.utils.book_new();

    generatedCards.forEach((card, cardIdx) => {
      const sheetData: string[][] = [];

      const headerRow = Array(cols).fill("");
      headerRow[0] = "BINGO";
      sheetData.push(headerRow);

      sheetData.push([]);

      card.forEach((row) => {
        sheetData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws["!cols"] = Array(cols).fill({ wch: 16 });

      const sheetName = `Card ${cardIdx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, "bingo-cards.xlsx");
    toast.success("Excel file downloaded!");
  };

  const handlePullWord = () => {
    if (pool.length === 0) {
      toast.info("All words have been pulled!");
      return;
    }
    const nextWord = pool[0];
    const newPool = pool.slice(1);
    
    setCurrentWord(nextWord);
    setPool(newPool);
    setPulled(prev => [nextWord, ...prev]);
  };

  const handleResetGame = () => {
    setPool(shuffleArray(parsedWords));
    setPulled([]);
    setCurrentWord(null);
    toast.success("Game reset! Ready to play.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground print:bg-white print:text-black">
      {/* Header - hide on print */}
      <header className="bg-primary text-primary-foreground py-6 px-4 md:px-8 shadow-md sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight">Bingo!</h1>
          </div>
          <p className="hidden md:block font-medium opacity-90">Game Night Generator</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 py-8">
        <Tabs defaultValue="builder" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted rounded-xl print:hidden">
            <TabsTrigger value="builder" className="rounded-lg text-base font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Grid2X2 className="w-4 h-4 mr-2" />
              Card Builder
            </TabsTrigger>
            <TabsTrigger value="player" className="rounded-lg text-base font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:text-secondary data-[state=active]:shadow-sm">
              <Play className="w-4 h-4 mr-2" />
              Game Player
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
              {/* Configuration Panel */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-border shadow-md">
                  <CardHeader className="bg-muted/50 border-b border-border/50">
                    <CardTitle className="text-xl">Words & Numbers</CardTitle>
                    <CardDescription>Enter the items for your bingo cards. Separate by commas or new lines.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <Label htmlFor="words" className="text-sm font-semibold">Word List</Label>
                        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          {parsedWords.length} items
                        </span>
                      </div>
                      <Textarea 
                        id="words" 
                        data-testid="input-words"
                        value={wordsText}
                        onChange={(e) => setWordsText(e.target.value)}
                        className="min-h-[180px] resize-none border-border/60 focus-visible:ring-secondary"
                        placeholder="e.g. 1, 2, 3, 4&#10;or Apple, Banana, Orange"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-md">
                  <CardHeader className="bg-muted/50 border-b border-border/50">
                    <CardTitle className="text-xl">Grid Settings</CardTitle>
                    <CardDescription>Customize the dimensions of your cards.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label className="text-sm font-semibold">Columns (Y)</Label>
                        <span className="font-bold text-primary">{cols}</span>
                      </div>
                      <Slider
                        data-testid="slider-cols"
                        value={[cols]}
                        min={3}
                        max={8}
                        step={1}
                        onValueChange={(val) => setCols(val[0])}
                        className="py-1"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label className="text-sm font-semibold">Rows (X)</Label>
                        <span className="font-bold text-primary">{rows}</span>
                      </div>
                      <Slider
                        data-testid="slider-rows"
                        value={[rows]}
                        min={2}
                        max={5}
                        step={1}
                        onValueChange={(val) => setRows(val[0])}
                        className="py-1"
                      />
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Label htmlFor="cards" className="text-sm font-semibold">Number of Cards to Generate</Label>
                      <Input
                        id="cards"
                        data-testid="input-card-count"
                        type="number"
                        min={1}
                        max={100}
                        value={cardCount}
                        onChange={(e) => setCardCount(parseInt(e.target.value) || 1)}
                        className="text-lg font-bold border-border/60 focus-visible:ring-secondary"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 pt-6 border-t border-border/50">
                    <Button 
                      data-testid="btn-generate"
                      onClick={handleGenerateCards} 
                      className="w-full text-lg h-12 shadow-sm font-bold active:scale-[0.98] transition-transform"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Cards
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Preview Panel */}
              <div className="lg:col-span-8">
                {generatedCards.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm">
                      <div>
                        <h2 className="text-xl font-bold text-card-foreground">Generated Cards</h2>
                        <p className="text-muted-foreground text-sm">{generatedCards.length} ready to download</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handlePrint} data-testid="btn-print" className="border-border/60 hover:bg-secondary/10 hover:text-secondary-foreground hover:border-secondary/30">
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                        <Button variant="outline" onClick={handleDownloadWord} data-testid="btn-download-word" className="border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30">
                          <FileText className="mr-2 h-4 w-4" />
                          Word
                        </Button>
                        <Button variant="outline" onClick={handleDownloadExcel} data-testid="btn-download-excel" className="border-border/60 hover:bg-green-500/10 hover:text-green-700 hover:border-green-500/30">
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Excel
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {generatedCards.map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-card border-2 border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-center mb-4 pb-2 border-b-2 border-border/50">
                            <h3 className="font-black text-2xl tracking-widest text-primary uppercase">BINGO</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Card #{idx + 1}</p>
                          </div>
                          
                          <div 
                            className="grid gap-1.5" 
                            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                          >
                            {card.map((row, rIdx) => 
                              row.map((word, cIdx) => (
                                <div 
                                  key={`${rIdx}-${cIdx}`} 
                                  className="aspect-square flex items-center justify-center p-1 md:p-2 text-center border-2 border-border/40 rounded-md bg-muted/20"
                                >
                                  <span className="font-bold text-xs md:text-sm leading-tight break-words break-all text-card-foreground">
                                    {word}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/30 rounded-2xl border-2 border-dashed border-border">
                    <div className="w-20 h-20 bg-background rounded-2xl shadow-sm border border-border flex items-center justify-center mb-6">
                      <Grid2X2 className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No Cards Generated</h3>
                    <p className="text-muted-foreground max-w-md">
                      Configure your grid size and word list, then click "Generate Cards" to see your bingo cards here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Print-only view */}
            <div className="hidden print:block space-y-12">
              {generatedCards.map((card, idx) => (
                <div key={idx} className="break-inside-avoid border-2 border-black p-6 rounded-xl">
                  <div className="text-center mb-6 pb-4 border-b-2 border-black">
                    <h3 className="font-black text-5xl tracking-[0.2em] text-black uppercase">BINGO</h3>
                    <p className="text-sm text-gray-500 font-medium mt-2">Card #{idx + 1}</p>
                  </div>
                  
                  <div 
                    className="grid gap-2" 
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  >
                    {card.map((row, rIdx) => 
                      row.map((word, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`} 
                          className="aspect-square flex items-center justify-center p-2 text-center border-2 border-black rounded-lg"
                        >
                          <span className="font-bold text-base sm:text-lg leading-tight text-black">
                            {word}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="player" className="animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Call Board */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="flex-1 border-border shadow-lg bg-gradient-to-b from-card to-muted/20 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
                  <CardHeader className="text-center pt-10 pb-4">
                    <CardTitle className="text-2xl font-black uppercase tracking-widest text-muted-foreground">Current Call</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center flex-1 min-h-[300px] px-4 pb-10">
                    <AnimatePresence mode="popLayout">
                      {currentWord ? (
                        <motion.div 
                          key={currentWord}
                          initial={{ scale: 0.5, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 1.1, opacity: 0, y: -20 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="text-center w-full"
                        >
                          <div className="inline-block bg-primary text-primary-foreground font-black text-6xl md:text-8xl py-8 px-12 rounded-3xl shadow-xl break-words break-all border-4 border-primary-foreground/20">
                            {currentWord}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center"
                        >
                          <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center mb-6 border-4 border-border border-dashed">
                            <Hash className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                          <h2 className="text-2xl font-bold text-muted-foreground">Ready to Play!</h2>
                          <p className="text-muted-foreground/80 mt-2">Click "Pull Next Word" to begin the game.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                  <CardFooter className="justify-center pb-10">
                    <Button 
                      data-testid="btn-pull-word"
                      size="lg" 
                      onClick={handlePullWord}
                      disabled={pool.length === 0 && pulled.length > 0}
                      className="h-20 px-12 text-2xl font-black rounded-full shadow-lg hover:shadow-xl active:scale-[0.95] transition-all bg-secondary text-secondary-foreground hover:bg-secondary/90 border-b-4 border-black/10"
                    >
                      {pool.length === 0 && pulled.length > 0 ? "Game Over" : "Pull Next Word"}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Progress stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border p-4 rounded-xl text-center shadow-sm">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                    <p className="text-3xl font-black">{parsedWords.length}</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-center shadow-sm">
                    <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Called</p>
                    <p className="text-3xl font-black text-primary">{pulled.length}</p>
                  </div>
                  <div className="bg-muted border border-border p-4 rounded-xl text-center shadow-sm">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
                    <p className="text-3xl font-black">{pool.length}</p>
                  </div>
                </div>
              </div>

              {/* History Panel */}
              <div className="lg:col-span-4">
                <Card className="border-border shadow-md h-full flex flex-col">
                  <CardHeader className="bg-muted/50 border-b border-border/50 flex flex-row items-center justify-between py-4">
                    <div>
                      <CardTitle className="text-lg">Call History</CardTitle>
                      <CardDescription>Previously pulled words</CardDescription>
                    </div>
                    <Button 
                      data-testid="btn-reset-game"
                      variant="outline" 
                      size="sm" 
                      onClick={handleResetGame}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-[400px]">
                    <div className="h-full max-h-[600px] overflow-y-auto p-4 custom-scrollbar">
                      {pulled.length > 0 ? (
                        <ul className="space-y-2">
                          <AnimatePresence>
                            {pulled.map((word, index) => (
                              <motion.li 
                                key={`${word}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded-lg flex items-center gap-3 font-semibold ${
                                  index === 0 
                                    ? "bg-primary/10 border border-primary/20 text-primary" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <span className="bg-background px-2 py-0.5 rounded text-xs font-bold shadow-sm opacity-80 min-w-[2rem] text-center">
                                  {pulled.length - index}
                                </span>
                                <span className="truncate">{word}</span>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                          <Grid2X2 className="w-12 h-12 mb-3" />
                          <p className="font-medium text-center px-6">The history will appear here once you start pulling words.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border));
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
