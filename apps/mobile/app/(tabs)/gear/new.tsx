import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gearCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button, SegmentedPicker } from "../../../components/form";
import { gearCategoryLabels, type GearCategory } from "../../../lib/gear";

const categoryOptions = (Object.keys(gearCategoryLabels) as GearCategory[]).map(
  (value) => ({ label: gearCategoryLabels[value], value }),
);

export default function NewGear() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GearCategory>("rope");
  const [brand, setBrand] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.send("/api/gear", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear"] });
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not add gear."),
  });

  function submit() {
    setError(null);
    const parsed = gearCreateSchema.safeParse({
      name,
      category,
      brand,
      purchased_on: purchasedOn,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid gear.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "Add gear", presentation: "modal" }} />
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. 70m Mammut Crag Classic"
      />
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category
        </Text>
        <SegmentedPicker
          value={category}
          onChange={setCategory}
          options={categoryOptions}
        />
      </View>
      <Field
        label="Brand"
        value={brand}
        onChangeText={setBrand}
        placeholder="optional"
      />
      <Field
        label="Purchased on"
        value={purchasedOn}
        onChangeText={setPurchasedOn}
        placeholder="YYYY-MM-DD (optional)"
        autoCapitalize="none"
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Wear, falls taken, retirement plans… (optional)"
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Add gear" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
