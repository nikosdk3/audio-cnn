"use client";

import { useEffect, useState } from "react";

import ColorScale from "~/components/ColorScale";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import FeatureMap from "~/components/FeatureMap";
import Waveform from "~/components/Waveform";

interface Prediction {
  class: string;
  confidence: number;
}

interface LayerData {
  shape: number[];
  values: number[][];
}

type VisualizationData = Record<string, LayerData>;

interface WaveformData {
  values: number[];
  sample_rate: number;
  duration: number;
}

interface ApiResponse {
  predictions: Prediction[];
  visualization: VisualizationData;
  input_spectrogram: LayerData;
  waveform: WaveformData;
}

function splitLayers(visualization: VisualizationData) {
  const main: [string, LayerData][] = [];
  const internals: Record<string, [string, LayerData][]> = {};
  for (const [name, data] of Object.entries(visualization)) {
    if (!name.includes(".")) {
      main.push([name, data]);
    } else {
      const [parent] = name.split(".");

      if (parent === undefined) continue;

      internals[parent] ??= [];
      internals[parent].push([name, data]);
    }
  }

  return { main, internals };
}

const ESC50_EMOJI_MAP: Record<string, string> = {
  dog: "🐶",
  rooster: "🐓",
  pig: "🐷",
  cow: "🐄",
  frog: "🐸",
  cat: "🐱",
  hen: "🐔",
  insects: "🐝",
  sheep: "🐑",
  crow: "🐦",
  rain: "🌧️",
  sea_waves: "🌊",
  crackling_fire: "🔥",
  crickets: "🦗",
  chirping_birds: "🐦🎶",
  water_drops: "💧",
  wind: "💨",
  pouring_water: "🚰",
  toilet_flush: "🚽",
  thunderstorm: "⛈️",
  crying_baby: "👶😭",
  sneezing: "🤧",
  clapping: "👏",
  breathing: "😮‍💨",
  coughing: "😷",
  footsteps: "👣",
  laughing: "😂",
  brushing_teeth: "🪥",
  snoring: "😴",
  drinking_sipping: "🥤",
  door_wood_knock: "🚪👊",
  mouse_click: "🖱️",
  keyboard_typing: "⌨️",
  door_wood_creaks: "🚪😬",
  can_opening: "🥫",
  washing_machine: "🧺",
  vacuum_cleaner: "🧹",
  clock_alarm: "⏰",
  clock_tick: "🕰️",
  glass_breaking: "🥂💥",
  helicopter: "🚁",
  chainsaw: "🪚",
  siren: "🚨",
  car_horn: "🚗📢",
  engine: "🔧🚗",
  train: "🚆",
  church_bells: "🔔⛪",
  airplane: "✈️",
  fireworks: "🎆",
  hand_saw: "🪚✋",
};

const getEmojiForClass = (className: string): string => {
  return ESC50_EMOJI_MAP[className] ?? "❤️";
};

export default function HomePage() {
  const [vizData, setVizData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setVizData(null);

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64String = Buffer.from(arrayBuffer).toString("base64");

        const response = await fetch(
          "https://nikosdk3--audio-cnn-inference-audioclassifier-inference.modal.run/",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio_data: base64String }),
          },
        );

        if (!response.ok) {
          throw new Error(`API Error ${response.statusText}`);
        }

        const data = (await response.json()) as ApiResponse;
        setVizData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occured",
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
      setIsLoading(false);
    };
  };

  const { main, internals } = vizData
    ? splitLayers(vizData?.visualization)
    : { main: [], internals: {} };

  return (
    <main className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-full">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-light tracking-tight text-stone-900">
            CNN Audio Visualizer
          </h1>
          <p className="mb-8 text-lg text-stone-600">
            Upload a WAV file to see the model&apos;s predictions and feature
            maps
          </p>

          <div className="flex flex-col items-center">
            <div className="relative inline-block">
              <input
                type="file"
                accept=".wav"
                id="file-upload"
                onChange={handleFileChange}
                disabled={isLoading}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
              />
              <Button
                className="border-stone-300"
                disabled={isLoading}
                variant="outline"
                size="lg"
              >
                {isLoading ? "Analyzing..." : "Choose file"}
              </Button>
            </div>

            {fileName && (
              <Badge
                variant="secondary"
                className="mt-4 bg-stone-200 text-stone-700"
              >
                {fileName}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent>
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {vizData && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-stone-900">
                  Top Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vizData.predictions.map((pred, i) => (
                    <div key={pred.class} className="space-y-2">
                      <div className="flex items-center justify-between space-x-3">
                        <div className="text-xl font-medium text-stone-700">
                          {getEmojiForClass(pred.class)}{" "}
                          <span>{pred.class.replaceAll("_", " ")}</span>
                        </div>
                        <Badge variant={i === 0 ? "default" : "secondary"}>
                          {(pred.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress value={pred.confidence * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-stone-900">
                    Input Spectrogram
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FeatureMap
                    data={vizData.input_spectrogram.values}
                    title={`${vizData.input_spectrogram.shape.join(" x ")}`}
                    spectrogram
                  />
                  <div className="mt-5 flex justify-end">
                    <ColorScale />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-stone-900">
                    Audio Waveform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Waveform
                    data={vizData.waveform.values}
                    title={`${vizData.waveform.duration}s * ${vizData.waveform.sample_rate}Hz`}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Feature Maps */}
            <Card>
              <CardHeader>
                <CardTitle>Convolutional Layer Outputs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-6">
                  {main.map(([mainName, mainData]) => (
                    <div key={mainName} className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium text-stone-700">
                          {mainName}
                        </h4>
                        <FeatureMap
                          data={mainData.values}
                          title={mainData.shape.join(" x ")}
                        />
                      </div>

                      {internals[mainName] && (
                        <div className="h-80 overflow-y-auto rounded border border-stone-200 bg-stone-50 p-2">
                          <div className="space-y-2">
                            {internals[mainName]
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([layerName, layerData]) => (
                                <FeatureMap
                                  key={layerName}
                                  data={layerData.values}
                                  title={layerName.replace(`${mainName}.`, "")}
                                  internal={true}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex justify-end">
                  <ColorScale />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
