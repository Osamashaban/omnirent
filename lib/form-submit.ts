// Submitting a form without React clearing it afterwards.
//
// A <form action={...}> is reset by React after every submit, error or not.
// For a select or checkbox that React controls, the screen then shows the
// first option (or nothing ticked) while React still believes the earlier
// choice is selected, so the next submit quietly sends something else. On
// Add user that turned a chosen role into Super Admin. Sending the form from
// onSubmit instead keeps everything the person typed and picked.

import { startTransition, type FormEvent } from "react";

export function submitKeepingValues(action: (form: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const form = new FormData(event.currentTarget, submitter instanceof HTMLElement ? submitter : null);
    startTransition(() => action(form));
  };
}
