import yup from "yup";



export const textQuestionDataSchema = yup.object({
    validation: yup.string().notRequired(),
    length: yup.number().notRequired()
});

export const longTextQuestionDataSchema = yup.object({
    validation: yup.string().notRequired(),
    length: yup.number().notRequired()
})

export const cityAutocompleteQuestionDataSchema = yup.object({
    country: yup.string().notRequired()
})

export const minecraftNameQuestionDataSchema = yup.object({
    allowBedrock: yup.boolean().notRequired()
})

export const sliderQuestionDataSchema = yup.object({
    steps: yup.number().default(1),
    max: yup.number().default(0),
    min: yup.number().default(10),
    unit: yup.string().notRequired()
})


export const imageUploadQuestionDataSchema = yup.object({
    maxSize: yup.number().default(1024),
    maxAmount: yup.number().default(1),
})

const questionTypes = [
    textQuestionDataSchema, longTextQuestionDataSchema, cityAutocompleteQuestionDataSchema, minecraftNameQuestionDataSchema, sliderQuestionDataSchema, imageUploadQuestionDataSchema
];

export const dropdownQuestionDataSchema = yup.object({
    maxSelect: yup.number().notRequired(),
    conditions: yup.array().of(yup.mixed().oneOf(questionTypes)).notRequired()
})



export const checkboxQuestionDataSchema = yup.object({
    ifTrue: yup.array().of(yup.mixed().oneOf(questionTypes)).notRequired(),
    ifFalse: yup.array().of(yup.mixed().oneOf(questionTypes)).notRequired()
})

export const questions = [
    textQuestionDataSchema,
    longTextQuestionDataSchema,
    cityAutocompleteQuestionDataSchema,
    minecraftNameQuestionDataSchema,
    sliderQuestionDataSchema,
    imageUploadQuestionDataSchema,
    dropdownQuestionDataSchema,
    checkboxQuestionDataSchema
]








