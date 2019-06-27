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

/*import ChangeTodoStatusMutation from '../mutations/ChangeTodoStatusMutation';
import RemoveTodoMutation from '../mutations/RemoveTodoMutation';
import RenameTodoMutation from '../mutations/RenameTodoMutation';
import TodoTextInput from './TodoTextInput';
*/
import React, { useState } from 'react';
import { createFragmentContainer, graphql } from 'react-relay-offline';
import { View, Typography } from '@wora/mui';
import RemoveTodoMutation from '../mutations/RemoveTodoMutation';
import ChangeTodoStatusMutation from '../mutations/ChangeTodoStatusMutation';

/*const StyledLabel = styled(Text)`
  text-align: center;
  flex: 1;  
`;*/
/*const StyledRemove = styled.TouchableOpacity`
  color: #af5b5e;
  background-color: white;
  text-align: center;
  height: 100%;
`;*/
/*
const StyledCheckBox = styled(CheckBox)`
  text-align: center;
  width: 40px;
  height: auto;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
`;*/

const Todo = ({ relay, todo, user }: any) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  console.log("text", todo)
  console.log("text", todo.text)
  const removeTodo = () =>
    RemoveTodoMutation.commit(relay.environment, todo, user);
  const handleDestroyClick = () => removeTodo();

  const handleCompleteChange = (complete:boolean) => {
    ChangeTodoStatusMutation.commit(relay.environment, complete, todo, user);
  };

  return <View style={{flex: 1, flexDirection: 'row',
  justifyContent: 'center', alignItems: 'center'}}>
        <Typography variant="subtitle1" align="center">{todo.text}</Typography>
  </View>;
  //return <Text key={todo.id}></Text>;
  /*const handleCompleteChange = (e: any) => {
    const complete = e.currentTarget.checked;
    ChangeTodoStatusMutation.commit(relay.environment, complete, todo, user);
  };

  
  const handleLabelDoubleClick = () => setIsEditing(true);
  const handleTextInputCancel = () => setIsEditing(false);

  const handleTextInputDelete = () => {
    setIsEditing(false);
    removeTodo();
  };

  const handleTextInputSave = (text: string) => {
    setIsEditing(false);
    RenameTodoMutation.commit(relay.environment, text, todo);
  };

  

  return (
    <li
      className={classnames({
        completed: todo.complete,
        editing: isEditing,
      })}>
      <div className="view">
        <input
          checked={todo.complete}
          className="toggle"
          onChange={handleCompleteChange}
          type="checkbox"
        />

        <label onDoubleClick={handleLabelDoubleClick}>{todo.text}</label>
        <button className="destroy" onClick={handleDestroyClick} />
      </div>

      {isEditing && (
        <TodoTextInput
          className="edit"
          commitOnBlur={true}
          initialValue={todo.text}
          onCancel={handleTextInputCancel}
          onDelete={handleTextInputDelete}
          onSave={handleTextInputSave}
        />
      )}
    </li>
  );*/
};

export default createFragmentContainer(Todo, {
  todo: graphql`
    fragment Todo_todo on Todo {
      complete
      id
      text
    }
  `,
  user: graphql`
    fragment Todo_user on User {
      id
      userId
      totalCount
      completedCount
    }
  `,
});
