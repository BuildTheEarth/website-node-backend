import yup from "yup";

export const textQuestionDataSchema = yup.object({
  length: yup.number().default(200),
});

export const longTextQuestionDataSchema = yup.object({
  length: yup.number().default(200),
});

export const cityAutocompleteQuestionDataSchema = yup.object({
  country: yup.string().notRequired(),
});

export const minecraftNameQuestionDataSchema = yup.object({});

export const sliderQuestionDataSchema = yup.object({
  steps: yup.number().default(1),
  max: yup.number().default(100),
  min: yup.number().default(0),
  unit: yup.string().notRequired(),
});

export const imageUploadQuestionDataSchema = yup.object({
  maxSize: yup.number().default(1024),
  maxAmount: yup.number().default(1),
});

export const dropdownQuestionDataSchema = yup.object({
  maxSelect: yup.number().default(1),
  conditions: yup.array().of(yup.string()).notRequired(),
});

export const checkboxQuestionDataSchema = yup.object({});

export const questions = [
  textQuestionDataSchema,
  longTextQuestionDataSchema,
  cityAutocompleteQuestionDataSchema,
  minecraftNameQuestionDataSchema,
  sliderQuestionDataSchema,
  imageUploadQuestionDataSchema,
  dropdownQuestionDataSchema,
  checkboxQuestionDataSchema,
];
