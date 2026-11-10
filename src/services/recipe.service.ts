import { api } from '@/lib/axios';

import type { CreateRecipeRequest, RecipeResponse, UpdateRecipeRequest } from '@/types/recipe';

export const getRecipes = async (keyword?: string, signal?: AbortSignal) => {
  const res = await api.get<RecipeResponse[]>('/recipes', {
    params: keyword ? { keyword } : undefined,
    signal,
  });

  return res.data;
};

export const createRecipe = async (recipeData: CreateRecipeRequest) => {
  const res = await api.post<RecipeResponse>('/recipes', recipeData);
  return res.data;
};

export const updateRecipe = async (recipeId: string, recipeData: UpdateRecipeRequest) => {
  const res = await api.patch<RecipeResponse>(`/recipes/${recipeId}`, recipeData);
  return res.data;
};

export const deleteRecipe = async (recipeId: string) => {
  const res = await api.delete<RecipeResponse>(`/recipes/${recipeId}`);
  return res.data;
};
