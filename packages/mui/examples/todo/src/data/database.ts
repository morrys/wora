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

export class Todo {
  id: string;
  text: string;
  complete: boolean;

  constructor(id: string, text: string, complete: boolean) {
    this.id = id;
    this.text = text;
    this.complete = complete;
  }
}

export class User {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

// Mock authenticated ID
export const USER_ID = 'me';

// Mock user database table
const usersById: Map<string, User> = new Map([[USER_ID, new User(USER_ID)]]);

// Mock todo database table
const todosById: Map<string, Todo> = new Map();
const todoIdsByUser: Map<string, ReadonlyArray<string>> = new Map([
  [USER_ID, []],
]);

// Seed initial data
addTodo('0', 'Taste JavaScript', true);
addTodo('1', 'Buy a unicorn', false);

function getTodoIdsForUser(id: string): ReadonlyArray<string> {
  return todoIdsByUser.get(id) || [];
}

export function addTodo(id:string, text: string, complete: boolean): string {
  const todo = new Todo(id, text, complete);
  todosById.set(todo.id, todo);

  const todoIdsForUser = getTodoIdsForUser(USER_ID);
  todoIdsByUser.set(USER_ID, todoIdsForUser.concat(todo.id));

  return todo.id;
}

export function changeTodoStatus(id: string, complete: boolean) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified complete value
  todosById.set(id, new Todo(id, todo.text, complete));
}

// Private, for strongest typing, only export `getTodoOrThrow`
function getTodo(id: string): (Todo | undefined) {
  return todosById.get(id);
}

export function getTodoOrThrow(id: string): Todo {
  const todo = getTodo(id);
  if (!todo) {
    throw new Error(`Invariant exception, Todo ${id} not found`);
  }
  return todo;
}

export function getTodos(status: string = 'any'): ReadonlyArray<Todo> {
  const todoIdsForUser = getTodoIdsForUser(USER_ID);
  const todosForUser = todoIdsForUser.map(getTodoOrThrow);

  if (status === 'any') {
    return todosForUser;
  }

  return todosForUser.filter(
    (todo: Todo): boolean => todo.complete === (status === 'completed'),
  );
}

// Private, for strongest typing, only export `getUserOrThrow`
function getUser(id: string): (User | undefined) {
  return usersById.get(id);
}

export function getUserOrThrow(id: string): User {
  const user = getUser(id);

  if (!user) {
    throw new Error(`Invariant exception, User ${id} not found`);
  }

  return user;
}

export function markAllTodos(complete: boolean): ReadonlyArray<string> {
  const todosToChange = getTodos().filter(
    (todo: Todo): boolean => todo.complete !== complete,
  );

  todosToChange.forEach(
    (todo: Todo): void => changeTodoStatus(todo.id, complete),
  );

  return todosToChange.map((todo: Todo): string => todo.id);
}

export function removeTodo(id: string) {
  const todoIdsForUser = getTodoIdsForUser(USER_ID);

  // Remove from the users list
  todoIdsByUser.set(
    USER_ID,
    todoIdsForUser.filter((todoId: string): boolean => todoId !== id),
  );

  // And also from the total list of Todos
  todosById.delete(id);
}

export function removeCompletedTodos(): ReadonlyArray<string> {
  const todoIdsForUser = getTodoIdsForUser(USER_ID);

  const todoIdsToRemove = getTodos()
    .filter((todo: Todo): boolean => todo.complete)
    .map((todo: Todo): string => todo.id);

  // Remove from the users list
  todoIdsByUser.set(
    USER_ID,
    todoIdsForUser.filter(
      (todoId: string): boolean => !todoIdsToRemove.includes(todoId),
    ),
  );

  // And also from the total list of Todos
  todoIdsToRemove.forEach((id: string): boolean => todosById.delete(id));

  return todoIdsToRemove;
}

export function renameTodo(id: string, text: string) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified text value
  todosById.set(id, new Todo(id, text, todo.complete));
}
