export type StudentStartRequest = {
  token: string;
  studentFullName: string;
};

export type StudentSubmitRequest = {
  attemptId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
};
