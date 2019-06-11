// @flow
/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { SyntheticEvent } from 'react';
import styled from 'styled-components';

interface Props {
  commitOnBlur?: boolean,
  initialValue?: string,
  onCancel?: () => void,
  onDelete?: () => void,
  onSave: (text: string) => void,
  placeholder?: string,
};

const ENTER_KEY_CODE = 13;
const ESC_KEY_CODE = 27;

const StyledInput = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 2px solid #FFF;
  width: 350px;
`

const TodoTextInput = ({
  commitOnBlur,
  initialValue,
  onCancel,
  onDelete,
  onSave,
  placeholder,
}: Props) => {
  const [text, setText] = useState<string>(initialValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef && inputRef.current) {
      (inputRef.current as any).focus();
    }
  }, [inputRef]);

  const commitChanges = () => {
    const newText = text.trim();

    if (onDelete && newText === '') {
      onDelete();
    } else if (onCancel && newText === initialValue) {
      onCancel();
    } else if (newText !== '') {
      onSave(newText);
      setText('');
    }
  };

  const handleBlur = () => {
    if (commitOnBlur) {
      commitChanges();
    }
  };

  const handleChange = (e: SyntheticEvent<HTMLInputElement>) =>
    setText(e.currentTarget.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onCancel && e.keyCode === ESC_KEY_CODE) {
      onCancel();
    } else if (e.keyCode === ENTER_KEY_CODE) {
      commitChanges();
    }
  };

  return (
    <StyledInput
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      ref={inputRef}
      value={text}
    />
  );
};

export default TodoTextInput;
