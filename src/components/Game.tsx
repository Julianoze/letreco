import { useEffect, useMemo, useState } from 'react';
import { DailyWord, GameWinState, GuessLetter, GuessLetterState, GuessValidationResult, KeyboardButtonStates, KeyboardLetterStates } from '../models';
import { getDailyWord, wordList } from '../utils';
import EndGameScreen from './EndGameScreen';
import GuessList from './GuessList';
import Keyboard from './Keyboard';

export const WORD_SIZE = 5;
export const GUESS_LIST_SIZE = 6;

export const KEY_BACKSPACE = 'Backspace';
export const KEY_ENTER = 'Enter';
export const KEY_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function Game() {
  const [guesses, setGuesses] = useState<GuessLetter[][]>([[]]);

  const [winState, setWinState] = useState<GameWinState>({
    isGameEnded: false, isGameWon: false,
  });
  const [buttonStates, setButtonStates] = useState<KeyboardButtonStates>({
    letters: true, back: false, enter: false,
  });
  const [letterStates, setLetterStates] = useState<KeyboardLetterStates>({});

  const [isEndGameScreenOpen, setIsEndGameScreenOpen] = useState<boolean>(false);

  const dailyWord = useMemo<DailyWord>(() => getDailyWord(), []);

  const getLastGuess = (guessesArray: GuessLetter[][] = guesses) => {
    return guessesArray[guessesArray.length - 1];
  }

  const updateLastGuess = (newGuess: GuessLetter[]): GuessLetter[][] => {
    return [...guesses.slice(0, guesses.length - 1), newGuess];
  }

  const updateKeyboardButtonStates = (guesses: GuessLetter[][]): KeyboardButtonStates => {
    const lastGuess = getLastGuess(guesses);

    return {
      letters: lastGuess.length < WORD_SIZE,
      back: lastGuess.length > 0,
      enter: lastGuess.length === WORD_SIZE,
    }
  }

  const isLastGuessInWordList = (): boolean => {
    const lastGuessWord = getLastGuess()
      .map(guess => guess.letter)
      .join('');

    return wordList.includes(lastGuessWord);
  }

  const updateLetterState = (states: KeyboardLetterStates, letter: string, newState: GuessLetterState) => {
    if (states[letter]) {
      if (states[letter] === 'right') return;
      if (states[letter] === 'displaced' && newState === 'wrong') return;
    }

    states[letter] = newState;
  }

  const validateLastGuess = (): GuessValidationResult => {
    const lastGuess = getLastGuess();
    const dailyWordLetters = dailyWord.word.split('');

    const missingLetters = [];
    const validatedGuess: GuessLetter[] = [];

    const newLetterStates = { ...letterStates } as KeyboardLetterStates;

    let isRightGuess = false;

    for (let i = 0; i < WORD_SIZE; i++) {
      const letterState = lastGuess[i].letter === dailyWordLetters[i] ? 'right' : 'wrong';

      validatedGuess.push({
        letter: lastGuess[i].letter,
        state: letterState,
      });

      if (letterState === 'wrong') missingLetters.push(dailyWordLetters[i]);
    }

    isRightGuess = missingLetters.length <= 0;

    if (missingLetters.length) {
      const wrongLetters = validatedGuess.filter(guess => guess.state === 'wrong');

      for (let guessLetter of wrongLetters) {
        const indexOnMissingLetters = missingLetters.indexOf(guessLetter.letter);

        if (indexOnMissingLetters !== -1) {
          guessLetter.state = 'displaced';
          missingLetters.splice(indexOnMissingLetters, 1);
        }
      }
    }

    for (const guessLetter of validatedGuess) {
      updateLetterState(newLetterStates, guessLetter.letter, guessLetter.state);
    }

    return {
      validatedGuess, letterStates: newLetterStates, isRightGuess,
    };
  }

  const handleKeyboardLetter = (letter: string) => {
    const updatedGuesses = updateLastGuess([...getLastGuess(), { letter, state: 'typing' }]);

    setGuesses(updatedGuesses);
    setButtonStates(updateKeyboardButtonStates(updatedGuesses));
  }

  const handleKeyboardBack = () => {
    const lastGuess = getLastGuess();
    const newGuess: GuessLetter[] = lastGuess
      .slice(0, lastGuess.length - 1)
      .map(oldGuess => ({ letter: oldGuess.letter, state: 'typing' }) as GuessLetter);

    const updatedGuesses = updateLastGuess(newGuess);

    setGuesses(updatedGuesses);
    setButtonStates(updateKeyboardButtonStates(updatedGuesses));
  }

  const handleKeyboardEnter = () => {
    if (!isLastGuessInWordList()) {
      const newGuess = getLastGuess()
        .map(guess => ({ letter: guess.letter, state: 'wordlistError' }) as GuessLetter);

      const updatedGuesses = updateLastGuess(newGuess);

      setGuesses(updatedGuesses);
      setButtonStates(updateKeyboardButtonStates(updatedGuesses));

      return;
    }

    const { validatedGuess, letterStates: newLetterStates, isRightGuess } = validateLastGuess();

    if (guesses.length === GUESS_LIST_SIZE || isRightGuess) {
      const updatedGuesses = updateLastGuess(validatedGuess);

      setWinState({ isGameEnded: true, isGameWon: isRightGuess });
      setIsEndGameScreenOpen(true);
      setGuesses(updatedGuesses);
      setButtonStates(updateKeyboardButtonStates(updatedGuesses));
      setLetterStates(newLetterStates);

    } else {
      const updatedGuesses = [...updateLastGuess(validatedGuess), []];

      setGuesses(updatedGuesses);
      setButtonStates(updateKeyboardButtonStates(updatedGuesses));
      setLetterStates(newLetterStates);
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === KEY_BACKSPACE && buttonStates.back) {
      handleKeyboardBack();
      return;
    }

    if (event.key === KEY_ENTER && buttonStates.enter) {
      handleKeyboardEnter();
      return;
    }

    if (KEY_LETTERS.includes(event.key) && buttonStates.letters) {
      handleKeyboardLetter(event.key.toUpperCase());
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const handleEndGameScreenClose = () => {
    setIsEndGameScreenOpen(false);
  }

  return (
    <div
      className='mt-3'
    >
      {isEndGameScreenOpen && <EndGameScreen
        dailyWord={dailyWord}
        guesses={guesses}
        isGameWon={winState.isGameWon}
        handleCloseScreen={handleEndGameScreenClose}
      />}

      <div className='mb-4'>
        <GuessList
          guesses={guesses}
        />
      </div>

      <Keyboard
        onLetterPress={handleKeyboardLetter}
        onBackPress={handleKeyboardBack}
        onEnterPress={handleKeyboardEnter}

        buttonStates={buttonStates}
        letterStates={letterStates}
        enabled={!winState.isGameEnded}
      />
    </div>
  )
}

export default Game;