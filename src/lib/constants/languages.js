// Language constants with ISO codes and colors

export const LANGUAGES = {
  fr: {
    name: "French",
    iso: "FRA",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-300"
  },
  de: {
    name: "German", 
    iso: "DEU",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300"
  },
  es: {
    name: "Spanish",
    iso: "ESP", 
    color: "yellow",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-300"
  },
  ru: {
    name: "Russian",
    iso: "RUS",
    color: "green",
    bgColor: "bg-green-100", 
    textColor: "text-green-800",
    borderColor: "border-green-300"
  },
  it: {
    name: "Italian",
    iso: "ITA",
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800", 
    borderColor: "border-purple-300"
  },
  pt: {
    name: "Portuguese",
    iso: "POR",
    color: "pink",
    bgColor: "bg-pink-100",
    textColor: "text-pink-800",
    borderColor: "border-pink-300"
  },
  zh: {
    name: "Chinese",
    iso: "CHN",
    color: "indigo",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-300"
  },
  ja: {
    name: "Japanese", 
    iso: "JPN",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-300"
  }
};

export const READING_MODES = {
  paragraph: "Paragraph",
  sentence: "Sentence"
};

// Legacy support for existing translation service
export const SUPPORTED_LANGUAGES = {
  fr: "French",
  de: "German", 
  es: "Spanish",
  ru: "Russian"
};